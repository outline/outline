// @flow
/* global navigator */

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
  var self = window, // this script is only for browsers anyway...
    u = 'application/octet-stream', // this default mime also triggers iframe downloads
    m = strMimeType || u,
    x = data,
    D = document,
    a = D.createElement('a'),
    z = function(a, o) {
      return String(a);
    },
    B = self.Blob || self.MozBlob || self.WebKitBlob || z,
    BB = self.MSBlobBuilder || self.WebKitBlobBuilder || self.BlobBuilder,
    fn = strFileName || 'download',
    blob,
    b,
    fr;

  if (String(this) === 'true') {
    //reverse arguments, allowing download.bind(true, "text/xml", "export.xml") to act as a callback
    x = [x, m];
    m = x[0];
    x = x[1];
  }

  //go ahead and download dataURLs right away
  if (String(x).match(/^data\:[\w+\-]+\/[\w+\-]+[,;]/)) {
    // $FlowIssue
    return navigator.msSaveBlob // IE10 can't do a[download], only Blobs:
      ? // $FlowIssue
        navigator.msSaveBlob(d2b(x), fn)
      : saver(x); // everyone else can save dataURLs un-processed
  } //end if dataURL passed?

  try {
    blob = x instanceof B ? x : new B([x], { type: m });
  } catch (y) {
    if (BB) {
      b = new BB();
      b.append([x]);
      blob = b.getBlob(m); // the blob
    }
  }

  function d2b(u) {
    if (typeof u !== 'string') {
      throw Error('Attempted to pass non-string to d2b');
    }
    var p = u.split(/[:;,]/),
      t = p[1],
      dec = p[2] === 'base64' ? atob : decodeURIComponent,
      bin = dec(p.pop()),
      mx = bin.length,
      i = 0,
      uia = new Uint8Array(mx);

    for (i; i < mx; ++i) uia[i] = bin.charCodeAt(i);

    return new B([uia], { type: t });
  }

  function saver(url, winMode) {
    if (typeof url !== 'string') {
      throw Error('Attempted to pass non-string url to saver');
    }

    if ('download' in a) {
      a.href = url;
      a.setAttribute('download', fn);
      a.innerHTML = 'downloading…';
      D.body && D.body.appendChild(a);
      setTimeout(function() {
        a.click();
        D.body && D.body.removeChild(a);
        if (winMode === true) {
          setTimeout(function() {
            self.URL.revokeObjectURL(a.href);
          }, 250);
        }
      }, 66);
      return true;
    }

    //do iframe dataURL download (old ch+FF):
    var f = D.createElement('iframe');
    D.body && D.body.appendChild(f);
    if (!winMode) {
      // force a mime that will download:
      url = 'data:' + url.replace(/^data:([\w\/\-\+]+)/, u);
    }

    f.src = url;
    setTimeout(function() {
      D.body && D.body.removeChild(f);
    }, 333);
  }

  // $FlowIssue
  if (navigator.msSaveBlob) {
    // IE10+ : (has Blob, but not a[download] or URL)
    return navigator.msSaveBlob(blob, fn);
  }

  if (self.URL) {
    // simple fast and modern way using Blob and URL:
    saver(self.URL.createObjectURL(blob), true);
  } else {
    // handle non-Blob()+non-URL browsers:
    if (
      blob &&
      (typeof blob === 'string' || blob.constructor === z) &&
      typeof m === 'string'
    ) {
      try {
        return saver('data:' + m + ';base64,' + self.btoa(blob));
      } catch (y) {
        // $FlowIssue
        return saver('data:' + m + ',' + encodeURIComponent(blob));
      }
    }

    // Blob but not URL:
    fr = new FileReader();
    fr.onload = function(e) {
      saver(this.result);
    };

    if (blob instanceof Blob) {
      fr.readAsDataURL(blob);
    }
  }
  return true;
}
