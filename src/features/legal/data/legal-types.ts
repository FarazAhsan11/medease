export type LegalTable = {
  headers: string[];
  rows: string[][];
};

// A string is a paragraph, a string array is a bullet list.
export type LegalBlock = string | string[] | LegalTable;

export type LegalSection = {
  title: string;
  body: LegalBlock[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  summary: string;
  // AUTH-03 records this next to each person's consent. Raise it when the
  // meaning changes, and people are asked again.
  version: string;
  updated: string;
  sections: LegalSection[];
};
