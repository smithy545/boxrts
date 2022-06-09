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

import { Constructor } from "./mixins.js";


function KeyInputMixin<TBase extends Constructor>(Base: TBase, keyStore?: {[key: string]: boolean}) {
    return class extends Base {
        private _keys: {[key: string]: boolean} = keyStore === undefined ? {} : keyStore;

        keyUpCallback(ev: KeyboardEvent) {
            this._keys[ev.key] = false;
            if(!ev.shiftKey)
                this._keys['shift'] = false;
            if(!ev.ctrlKey)
                this._keys['ctrl'] = false;
            if(!ev.altKey)
                this._keys['alt'] = false;
        }

        keyDownCallback(ev: KeyboardEvent) {
            this._keys[ev.key] = true;
            if(ev.shiftKey)
                this._keys['shift'] = true;
            if(ev.ctrlKey)
                this._keys['ctrl'] = true;
            if(ev.altKey)
                this._keys['alt'] = true;
        }

        getKey(key: string) {
            return this._keys[key];
        }
    };
};

export { KeyInputMixin };