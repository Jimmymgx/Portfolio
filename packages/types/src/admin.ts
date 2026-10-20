/** Entities as returned by the admin API (both languages, status and bookkeeping fields). */
import type {
  AdminRole,
  ContentState,
  ProjectCreate,
  PublishStatus,
  SectionKey,
  SkillCreate,
} from "@portfolio/validation";

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaDto {
  id: number;
  originalName: string;
  title: string | null;
  publicUrl: string;
  mimeType: string;
  kind: "IMAGE" | "VIDEO" | "DOCUMENT";
  fileSize: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  altTextAr: string | null;
  storageProvider: "LOCAL" | "S3";
  createdAt: string;
  /** Number of content records that reference this file. */
  usageCount?: number;
}

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

/** Collection entity: the input shape plus identity and publishing fields. */
export type Entity<T> = T & { id: number; status: PublishStatus; sortOrder: number };

export type SkillDto = Entity<Omit<SkillCreate, "projectIds">> &
  Timestamps & { slug: string; projectIds: number[]; logoUrl: string | null };

export type ProjectDto = Entity<Omit<ProjectCreate, "skillIds">> &
  Timestamps & {
    slug: string;
    publishedAt: string | null;
    skillIds: number[];
    coverUrl: string | null;
  };

/** Singleton record: draft and published copies side by side. */
export interface SingletonDto<T> {
  draft: (T & { state: ContentState; updatedAt: string }) | null;
  published: (T & { state: ContentState; updatedAt: string }) | null;
  /** True when the draft differs from what is live. */
  hasUnpublishedChanges: boolean;
}

export interface SectionSettingDto {
  key: SectionKey;
  displayName: string;
  displayNameAr: string | null;
  isEnabled: boolean;
  sortOrder: number;
  configuration: { showNextCard?: boolean } | null;
}

export interface SessionUserDto {
  user: AdminUserDto;
  csrfToken: string;
}

export interface OwnerDto {
  fullName: string | null;
  fullNameAr: string | null;
  firstName: string | null;
  firstNameAr: string | null;
  avatarUrl: string | null;
  avatarAlt: string | null;
}

export interface SetupItem {
  id: string;
  title: string;
  hint: string;
  href: string;
  done: boolean;
}

export interface AreaStatus {
  key: string;
  label: string;
  href: string;
  status: "LIVE" | "DRAFT" | "EMPTY";
}

export interface DashboardStats {
  projects: { total: number; published: number; draft: number };
  skills: number;
  certifications: number;
  achievements: number;
  media: number;
  newMessages: number;
}
