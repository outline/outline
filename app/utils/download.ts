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
  const self = window,
    // this script is only for browsers anyway...
    u = "application/octet-stream",
    // this default mime also triggers iframe downloads
    m = strMimeType || u,
    x = data,
    D = document,
    a = D.createElement("a"),
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'a' implicitly has an 'any' type.
    z = function (a) {
      return String(a);
    },
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'MozBlob' does not exist on type 'Window ... Remove this comment to see the full error message
    B = self.Blob || self.MozBlob || self.WebKitBlob || z,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'WebKitBlobBuilder' does not exist on typ... Remove this comment to see the full error message
    BB = self.MSBlobBuilder || self.WebKitBlobBuilder || self.BlobBuilder,
    fn = strFileName || "download",
    // @ts-expect-error ts-migrate(1155) FIXME: 'const' declarations must be initialized.
    blob,
    // @ts-expect-error ts-migrate(1155) FIXME: 'const' declarations must be initialized.
    b,
    // @ts-expect-error ts-migrate(1155) FIXME: 'const' declarations must be initialized.
    fr;

  if (String(this) === "true") {
    //reverse arguments, allowing download.bind(true, "text/xml", "export.xml") to act as a callback
    // @ts-expect-error ts-migrate(2588) FIXME: Cannot assign to 'x' because it is a constant.
    x = [x, m];
    // @ts-expect-error ts-migrate(2588) FIXME: Cannot assign to 'm' because it is a constant.
    m = x[0];
    // @ts-expect-error ts-migrate(2588) FIXME: Cannot assign to 'x' because it is a constant.
    x = x[1];
  }

  // go ahead and download dataURLs right away
  if (String(x).match(/^data:[\w+-]+\/[\w+-]+[,;]/)) {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    return saver(x); // everyone else can save dataURLs un-processed
  }

  //end if dataURL passed?
  try {
    // @ts-expect-error ts-migrate(2588) FIXME: Cannot assign to 'blob' because it is a constant.
    blob =
      x instanceof B
        ? x
        : new B([x], {
            type: m,
          });
  } catch (y) {
    if (BB) {
      // @ts-expect-error ts-migrate(2588) FIXME: Cannot assign to 'b' because it is a constant.
      b = new BB();
      b.append([x]);
      // @ts-expect-error ts-migrate(2588) FIXME: Cannot assign to 'blob' because it is a constant.
      blob = b.getBlob(m); // the blob
    }
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'u' implicitly has an 'any' type.
  function d2b(u) {
    if (typeof u !== "string") {
      throw Error("Attempted to pass non-string to d2b");
    }

    const p = u.split(/[:;,]/),
      t = p[1],
      dec = p[2] === "base64" ? atob : decodeURIComponent,
      // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
      bin = dec(p.pop()),
      mx = bin.length,
      i = 0,
      uia = new Uint8Array(mx);

    // @ts-expect-error ts-migrate(2588) FIXME: Cannot assign to 'i' because it is a constant.
    for (i; i < mx; ++i) uia[i] = bin.charCodeAt(i);

    return new B([uia], {
      type: t,
    });
  }

  function saver(url: string, winMode: boolean) {
    if (typeof url !== "string") {
      throw Error("Attempted to pass non-string url to saver");
    }

    if ("download" in a) {
      a.href = url;
      a.setAttribute("download", fn);
      a.innerHTML = "downloading…";
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

    //do iframe dataURL download (old ch+FF):
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
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
        return saver("data:" + m + ";base64," + self.btoa(blob));
      } catch (y) {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
        return saver("data:" + m + "," + encodeURIComponent(blob));
      }
    }

    // Blob but not URL:
    // @ts-expect-error ts-migrate(2588) FIXME: Cannot assign to 'fr' because it is a constant.
    fr = new FileReader();

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'e' implicitly has an 'any' type.
    fr.onload = function (e) {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      saver(this.result);
    };

    if (blob instanceof Blob) {
      fr.readAsDataURL(blob);
    }
  }

  return true;
}
