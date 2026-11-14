import "server-only";

// The generic build: SVG only, no Node or canvas code.
import { toSVG } from "bwip-js/generic";

// A Code 128 barcode as SVG markup, for sample labels. Code 128 is the usual
// symbology for specimen tubes (CLSI AUTO12). The input is always one of our
// own sample codes, checked against their format, so the markup is safe to
// put in the page.
const SAMPLE_CODE = /^\d{6}-\d{4,}-[BUS]$/;

export function code128Svg(code: string) {
  if (!SAMPLE_CODE.test(code)) throw new Error("Not a sample code");
  // Stretched to fill the box the label gives it.
  return toSVG({
    bcid: "code128",
    text: code,
    height: 8,
    includetext: false,
    // The quiet zone scanners need either side: 10 modules.
    paddingwidth: 10,
    paddingheight: 0,
  })
    .replace("<svg ", '<svg preserveAspectRatio="none" ')
    // Bars in the label's own colour token.
    .replaceAll('"#000000"', '"currentColor"');
}
