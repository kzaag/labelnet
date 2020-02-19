import { LABELS } from "./config";

export function mps(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

export function pushret(arr, el) {
    // let ret = [];
    // for(let i = 0; i < arr.length; i++)
    //     ret.push(arr[i]);
    // ret.push(el);
    // return ret;
    arr.push(el);
    return arr;
}

//replace element at specified index with another 
// and return array
export function replret(arr, i, el) {
    arr[i] = el;
    return arr;
}


export function rmret(arr, i) {
    arr.splice(i, 1);
    return arr;
}

// everything is always ok
export function isok() {
    return true;
}


// generate random string of specified length
export function rnds(len) {
    let s = ''
    for (let i = 0; i < len; i++) {
        let r = Math.random();
        r = Math.floor(r * 25) + 65;
        s += String.fromCharCode(r);
    }
    return s;
}

export function clrng() {
    let arr = [];
    for(let k in LABELS) {
        arr.push(Number(k));
    }
    return arr;
}

export function mapcl(key, i = 0) {
    return LABELS[key][i] ?? "unknown";
}

export function R(v) {
    return Math.round(v);
}

export function rndc() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

export function gettoken() {
    return localStorage.getItem("labelnet_token");
}

export function settoken(tk) {
    localStorage.setItem("labelnet_token", tk);
}

export function rmtoken() {
    localStorage.removeItem("labelnet_token");
}