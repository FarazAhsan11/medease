import { Fragment } from "react";

import {
  TELEMEDICINE_CONSENT,
  type ConsentDocument,
} from "../lib/consent-documents";
import { ConsentCheckbox } from "./consent-checkbox";
import { ConsentDocumentLink } from "./consent-document-link";

type ConsentFieldsProps = {
  idPrefix: string;
  documents: readonly ConsentDocument[];
  fieldError: (name: string) => string | undefined;
};

function separator(index: number, count: number) {
  if (index === 0) return "";
  return index === count - 1 ? " and " : ", ";
}

// The telemedicine consent has its own box: it covers data leaving Pakistan and
// can be withdrawn by itself, so it can't sit inside a general "I agree".
export function ConsentFields({
  idPrefix,
  documents,
  fieldError,
}: ConsentFieldsProps) {
  const general = documents.filter(
    (document) => document !== TELEMEDICINE_CONSENT,
  );

  return (
    <div className="grid gap-3">
      {general.length > 0 && (
        <ConsentCheckbox
          id={`${idPrefix}-consent`}
          name="consent"
          error={fieldError("consent")}
        >
          I agree to the{" "}
          {general.map((document, index) => (
            <Fragment key={document}>
              {separator(index, general.length)}
              <ConsentDocumentLink document={document} />
            </Fragment>
          ))}
          .
        </ConsentCheckbox>
      )}
      {documents.includes(TELEMEDICINE_CONSENT) && (
        <ConsentCheckbox
          id={`${idPrefix}-telemedicine-consent`}
          name="telemedicineConsent"
          error={fieldError("telemedicineConsent")}
        >
          I agree to the <ConsentDocumentLink document={TELEMEDICINE_CONSENT} />
          , including that my health data is stored and processed outside
          Pakistan.
        </ConsentCheckbox>
      )}
    </div>
  );
}
