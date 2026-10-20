"use client";

import { use } from "react";
import { ProjectEditor } from "@/features/projects/project-editor";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectEditor id={Number(id)} />;
}
