export const DOCUMENTS_BUCKET = "doctor-documents";

const MB = 1024 * 1024;

export const documentKinds = ["photo", "license", "degree"] as const;

export type DocumentKind = (typeof documentKinds)[number];

// `types` maps each accepted file type to the extension it's stored with.
export const documentRules: Record<
  DocumentKind,
  { label: string; maxMb: number; types: Record<string, string> }
> = {
  photo: {
    label: "Profile photo",
    maxMb: 2,
    types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
  },
  license: {
    label: "License",
    maxMb: 5,
    types: {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png",
    },
  },
  degree: {
    label: "Degree",
    maxMb: 5,
    types: { "application/pdf": "pdf" },
  },
};

export function isAllowedFile(kind: DocumentKind, type: string, size: number) {
  const rule = documentRules[kind];
  return type in rule.types && size > 0 && size <= rule.maxMb * MB;
}
