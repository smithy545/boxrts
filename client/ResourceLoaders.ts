/*
MIT License

Copyright (c) 2022 Philip Arturo Smith

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


function loadJsonFile(path: string, callback: (xhr: XMLHttpRequest) => void, error?: (ev: ProgressEvent<EventTarget>) => void) {
    const xhr = new XMLHttpRequest();
    xhr.overrideMimeType("application/json");
    xhr.onreadystatechange = () => {
        if(xhr.readyState === 4 && xhr.status === 200) {
            callback(xhr);
        }
    }
    xhr.onerror = (ev: ProgressEvent<EventTarget>) => {
        if(typeof error === undefined) {
            console.error(`Could not load file from ${path}: ${ev}`);
        } else {
            error(ev);
        }
    }
    xhr.open("GET", path, true);
    xhr.send();
}

function loadObjectFile(path: string, callback: (xhr: XMLHttpRequest) => void, error?: (ev: ProgressEvent<EventTarget>) => void) {
    const xhr = new XMLHttpRequest();
    xhr.overrideMimeType("application/obj");
    xhr.onreadystatechange = () => {
        if(xhr.readyState === 4 && xhr.status === 200) {
            callback(xhr);
        }
    }
    xhr.onerror = (ev: ProgressEvent<EventTarget>) => {
        if(typeof error === undefined) {
            console.error(`Could not load file from ${path}: ${ev}`);
        } else {
            error(ev);
        }
    }
    xhr.open("GET", path, true);
    xhr.send();
}

function loadImageFile(src: string, callback: (img: HTMLImageElement) => void) {
    const img = document.createElement('img');
    img.addEventListener('load', function() { callback(img); }, false);
    img.src = src;
}

export { loadJsonFile, loadImageFile, loadObjectFile };