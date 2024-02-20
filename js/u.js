if (!String.prototype.trim) {
    String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};
}
if (!String.prototype.stripTags) {
    String.prototype.stripTags=function(){return this.replace(/<\/?[^>]+>/gi, '');};
}
if (!String.prototype.ucFirst) {
    String.prototype.ucFirst = function() {
        var str = this;
        if (str.length) {
            str = str.charAt(0).toUpperCase() + str.slice(1);
        }
        return str;
    };
}


function escapeHtml(text) {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function basename(path, suffix) {	// Returns filename component of path
    //
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: Ash Searle (http://hexmen.com/blog/)
    // +   improved by: Lincoln Ramsay
    // +   improved by: djmix

    var b = path.replace(/^.*[\/\\]/g, '');
    if (typeof(suffix) == 'string' && b.substr(b.length-suffix.length) == suffix) {
        b = b.substr(0, b.length-suffix.length);
    }
    return b;
}

function urlencode(str) {

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

var rg1=/^[^\\/:\*\?"<>\|]+$/; // forbidden characters \ / : * ? " < > |
var rg2=/^\./; // cannot start with dot (.)
var rg3=/^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i; // forbidden file names

function isValidFileName(fname)
{
    return rg1.test(fname)&&!rg2.test(fname)&&!rg3.test(fname);
}