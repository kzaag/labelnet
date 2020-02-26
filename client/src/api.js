import { gettoken } from "./helpers";
import { API as api } from './config';

export function login(name, password) {
    let hk = ["x-user", "x-password"]
    let hv = [name, password]
    return xhr(api + "/l", "post", null, null, hk, hv);
}

export function validate() {
    return xhr(api + "/v", "post", gettoken(), null, null, null);
}

export function getix(set, sset) {
    return xhr(
        api + "/i?s=" + set + "&ss=" + sset, 
        "get", 
        gettoken(), 
        null, 
        null, 
        null);
}

export function getimg(set, sset, name, hdrs = []) {
    return xhr(
        api + "/i?s=" + set + "&ss=" + sset + "&n=" + name, 
        "get", 
        gettoken(), 
        null, 
        null, 
        null,
        hdrs);
}

export function post(img, set, sset, name, llen) {

    let hk = ["Content-type"];
    let hv = ["octet-stream"];

    return xhr(
        api + "/i?s=" + set + "&ss=" + sset + "&n=" + name + "&ll=" + llen, 
        "post", 
        gettoken(), 
        img, 
        hk, 
        hv)
}

export function xhr(url, method, token, body, hk, hv, rh) {

    return new Promise((res, rej) => {

        let xhr = new XMLHttpRequest();
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
        xhr.open(method, url);

        if (token)
            xhr.setRequestHeader("Authorization", "Bearer " + token);

        if(hk) {
            for(let i = 0; i < hk.length; i++) {
                xhr.setRequestHeader(hk[i], hv[i])
            }
        }

        xhr.onload = function (e) {

            let r = xhr.responseText
            
            if(rh) {
                for(let i =0; i < rh.length; i++) {
                    rh[i] = xhr.getResponseHeader(rh[i]);
                }
            }                

            switch (xhr.status) {
                case 200:
                    res(r);
                    break;
                case 204:
                case 304:
                    res(xhr.status);
                    break;
                case 404:
                case 500:
                case 422:
                case 400:
                case 401:
                case 403:
                default:
                    rej(xhr.status + "\n" + (r ?? ""));
                    break;
            }
            return;
        };

        xhr.send(body);
    });
}
