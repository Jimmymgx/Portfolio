/**
 * Creates the first administrator (or any additional SUPER_ADMIN).
 *
 *   pnpm --filter @portfolio/api admin:create -- --email you@example.com --name "Your Name"
 *
 * The password is typed at a hidden prompt. There are no default credentials and the password is never stored in a file.
 * For automation (CI, containers) pass --non-interactive and provide the password in the ADMIN_PASSWORD environment variable.
 * Requires the database migration to have been applied.
 */
import readline from "node:readline";
import { adminRoleSchema, email as emailSchema, passwordSchema } from "@portfolio/validation";
import { prisma } from "../src/config/database.js";
import { hashPassword } from "../src/common/utils/crypto.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Mute echo while the password is typed.
      const rlAny = rl as unknown as { _writeToOutput: (s: string) => void };
      rlAny._writeToOutput = (s: string) => {
        if (s.includes(question)) process.stdout.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const rawEmail = arg("email") ?? (await ask("Email: "));
  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) throw new Error("Enter a valid email address");

  const name = (arg("name") ?? (await ask("Name: "))).trim();
  if (!name) throw new Error("Name is required");

  const role = adminRoleSchema.parse(arg("role") ?? "SUPER_ADMIN");

  if (await prisma.adminUser.findUnique({ where: { email: email.data } })) {
    throw new Error("An account with this email already exists");
  }

  let password: string;
  if (process.argv.includes("--non-interactive")) {
    password = process.env.ADMIN_PASSWORD ?? "";
    if (!password) throw new Error("Set the ADMIN_PASSWORD environment variable when using --non-interactive");
  } else {
    password = await ask("Password (min 12 characters, hidden): ", true);
    const confirm = await ask("Repeat password: ", true);
    if (password !== confirm) throw new Error("Passwords do not match");
  }
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(". "));

  const user = await prisma.adminUser.create({
    data: { name, email: email.data, role, passwordHash: await hashPassword(password) },
  });
  await prisma.auditLog.create({ data: { actorEmail: "cli", action: "user.created_by_cli", entityType: "AdminUser", entityId: user.id, metadata: { role } } });
  console.log(`\nCreated ${role} ${user.email}. You can now sign in to the dashboard.`);
}

main()
  .catch((err) => {
    console.error(`\n${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
