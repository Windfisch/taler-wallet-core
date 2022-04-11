/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { createExample } from "../test-utils.js";
import { termsHtml, termsPdf, termsPlain, termsXml } from "./termsExample.js";
import { TermsOfServiceSection as TestedComponent } from "./TermsOfServiceSection.js";

function parseFromString(s: string): Document {
  if (typeof window === "undefined") {
    return {} as Document;
  }
  return new window.DOMParser().parseFromString(s, "text/xml");
}

export default {
  title: "cta/terms of service",
  component: TestedComponent,
};

export const ReviewingPLAIN = createExample(TestedComponent, {
  terms: {
    content: {
      type: "plain",
      content: termsPlain,
    },
    status: "new",
    version: "",
  },
  reviewing: true,
});

export const ReviewingHTML = createExample(TestedComponent, {
  terms: {
    content: {
      type: "html",
      href: new URL(`data:text/html;base64,${toBase64(termsHtml)}`),
    },
    version: "",
    status: "new",
  },
  reviewing: true,
});

function toBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    }),
  );
}

export const ReviewingPDF = createExample(TestedComponent, {
  terms: {
    content: {
      type: "pdf",
      location: new URL(`data:text/html;base64,${toBase64(termsPdf)}`),
    },
    status: "new",
    version: "",
  },
  reviewing: true,
});

export const ReviewingXML = createExample(TestedComponent, {
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    status: "new",
    version: "",
  },
  reviewing: true,
});

export const NewAccepted = createExample(TestedComponent, {
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    status: "new",
    version: "",
  },
  reviewed: true,
});

export const ShowAgainXML = createExample(TestedComponent, {
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    version: "",
    status: "new",
  },
  reviewed: true,
  reviewing: true,
});

export const ChangedButNotReviewable = createExample(TestedComponent, {
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    version: "",
    status: "changed",
  },
});

export const ChangedAndAllowReview = createExample(TestedComponent, {
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    version: "",
    status: "changed",
  },
  onReview: () => null,
});

export const NewButNotReviewable = createExample(TestedComponent, {
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    version: "",
    status: "new",
  },
});

export const NewAndAllowReview = createExample(TestedComponent, {
  terms: {
    content: {
      type: "xml",
      document: parseFromString(termsXml),
    },
    version: "",
    status: "new",
  },
  onReview: () => null,
});

export const NotFound = createExample(TestedComponent, {
  terms: {
    content: undefined,
    status: "notfound",
    version: "",
  },
});

export const AlreadyAccepted = createExample(TestedComponent, {
  terms: {
    status: "accepted",
    content: undefined,
    version: "",
  },
});
