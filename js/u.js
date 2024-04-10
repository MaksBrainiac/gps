if (!String.prototype.stripTags) {
    String.prototype.stripTags=function(){return this.replace(/<\/?[^>]+>/gi, '');};
}
if (!String.prototype.ucFirst) {
    String.prototype.ucFirst = function() {
        let str = this;
        if (str.length) {
            str = str.charAt(0).toUpperCase() + str.slice(1);
        }
        return str;
    };
}

function escapeHtml(text)
{
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Returns filename component of path
function basename(path, suffix)
{
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: Ash Searle (http://hexmen.com/blog/)
    // +   improved by: Lincoln Ramsay
    // +   improved by: djmix

    let b = path.replace(/^.*[\/\\]/g, '');
    if (typeof(suffix) == 'string' && b.substr(b.length-suffix.length) == suffix) {
        b = b.substr(0, b.length-suffix.length);
    }
    return b;
}

function urlencode(str)
{
    str = (str + '')
        .toString();

    return encodeURIComponent(str)
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A')
        .replace(/%20/g, '+');
}

function isValidFileName(fname)
{
    const rg1=/^[^\\/:\*\?"<>\|]+$/; // forbidden characters \ / : * ? " < > |
    const rg2=/^\./; // cannot start with dot (.)
    const rg3=/^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i; // forbidden file names

    return rg1.test(fname)&&!rg2.test(fname)&&!rg3.test(fname);
}

function attachExt(title, ext)
{
    const format = title.split('.').pop().toLocaleUpperCase();
    return format === ext ? title : (title + '.' + ext);
}

function toAsync(next)
{
  return function (...args) {
    return new Promise((resolve, reject) => {
      function callback(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }

      args.push(callback);
      next.call(this, ...args);
    });
  };
}