// download.js v3.0, by dandavis; 2008-2014. [CCBY2] see http://danml.com/download.html for tests/usage
// v1 landed a FF+Chrome compat way of downloading strings to local un-named files, upgraded to use a hidden frame and optional mime
// v2 added named files via a[download], msSaveBlob, IE (10+) support, and window.URL support for larger+faster saves than dataURLs
// v3 added dataURL and Blob Input, bind-toggle arity, and legacy dataURL fallback was improved with force-download mime and base64 support
// data can be a string, Blob, File, or dataURL
export default function download(
  data: Blob | string | File,
  strFileName: string,
  strMimeType?: string
) {
  const self = window;
  // this script is only for browsers anyway...
  const u = "application/octet-stream";

  // this default mime also triggers iframe downloads
  let m = strMimeType || u,
    x = data;
  const D = document,
    a = D.createElement("a"),
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'a' implicitly has an 'any' type.
    z = function (o) {
      return String(o);
    },
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'MozBlob' does not exist on type 'Window ... Remove this comment to see the full error message
    B = self.Blob || self.MozBlob || self.WebKitBlob || z,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'WebKitBlobBuilder' does not exist on typ... Remove this comment to see the full error message
    BB = self.MSBlobBuilder || self.WebKitBlobBuilder || self.BlobBuilder,
    fn = strFileName || "download";

  let blob, b, fr;

  if (String(this) === "true") {
    // reverse arguments, allowing download.bind(true, "text/xml", "export.xml") to act as a callback
    // @ts-expect-error this is weird code
    x = [x, m];
    // @ts-expect-error this is weird code
    m = x[0];
    // @ts-expect-error this is weird code
    x = x[1];
  }

  // go ahead and download dataURLs right away
  if (String(x).match(/^data:[\w+-]+\/[\w+-]+[,;]/)) {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    return saver(x); // everyone else can save dataURLs un-processed
  }

  // end if dataURL passed?
  try {
    blob =
      x instanceof B
        ? x
        : new B([x], {
            type: m,
          });
  } catch (y) {
    if (BB) {
      b = new BB();
      b.append([x]);
      blob = b.getBlob(m); // the blob
    }
  }

  function saver(url: string, winMode = false) {
    if (typeof url !== "string") {
      throw Error("Attempted to pass non-string url to saver");
    }

    if ("download" in a) {
      a.href = url;
      a.setAttribute("download", fn);
      D.body && D.body.appendChild(a);
      setTimeout(function () {
        a.click();
        D.body && D.body.removeChild(a);

        if (winMode === true) {
          setTimeout(function () {
            self.URL.revokeObjectURL(a.href);
          }, 250);
        }
      }, 66);
      return true;
    }

    // do iframe dataURL download (old ch+FF):
    const f = D.createElement("iframe");
    D.body && D.body.appendChild(f);

    if (!winMode) {
      // force a mime that will download:
      url = "data:" + url.replace(/^data:([\w/\-+]+)/, u);
    }

    f.src = url;
    setTimeout(function () {
      D.body && D.body.removeChild(f);
    }, 333);

    return true;
  }

  if (self.URL) {
    // simple fast and modern way using Blob and URL:
    saver(self.URL.createObjectURL(blob), true);
  } else {
    // handle non-Blob()+non-URL browsers:
    if (
      blob &&
      (typeof blob === "string" || blob.constructor === z) &&
      typeof m === "string"
    ) {
      try {
        return saver("data:" + m + ";base64," + self.btoa(blob));
      } catch (y) {
        return saver("data:" + m + "," + encodeURIComponent(blob));
      }
    }

    // Blob but not URL:
    fr = new FileReader();

    fr.onload = function () {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      saver(this.result);
    };

    if (blob instanceof Blob) {
      fr.readAsDataURL(blob);
    }
  }

  return true;
}
