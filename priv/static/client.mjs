// build/dev/javascript/prelude.mjs
var CustomType = class {
  withFields(fields) {
    let properties = Object.keys(this).map(
      (label) => label in fields ? fields[label] : this[label]
    );
    return new this.constructor(...properties);
  }
};
var List = class {
  static fromArray(array3, tail) {
    let t = tail || new Empty();
    for (let i = array3.length - 1; i >= 0; --i) {
      t = new NonEmpty(array3[i], t);
    }
    return t;
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  // @internal
  atLeastLength(desired) {
    let current = this;
    while (desired-- > 0 && current)
      current = current.tail;
    return current !== void 0;
  }
  // @internal
  hasLength(desired) {
    let current = this;
    while (desired-- > 0 && current)
      current = current.tail;
    return desired === -1 && current instanceof Empty;
  }
  // @internal
  countLength() {
    let current = this;
    let length3 = 0;
    while (current) {
      current = current.tail;
      length3++;
    }
    return length3 - 1;
  }
};
function prepend(element2, tail) {
  return new NonEmpty(element2, tail);
}
function toList(elements2, tail) {
  return List.fromArray(elements2, tail);
}
var ListIterator = class {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
};
var Empty = class extends List {
};
var NonEmpty = class extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
};
var BitArray = class {
  /**
   * The size in bits of this bit array's data.
   *
   * @type {number}
   */
  bitSize;
  /**
   * The size in bytes of this bit array's data. If this bit array doesn't store
   * a whole number of bytes then this value is rounded up.
   *
   * @type {number}
   */
  byteSize;
  /**
   * The number of unused high bits in the first byte of this bit array's
   * buffer prior to the start of its data. The value of any unused high bits is
   * undefined.
   *
   * The bit offset will be in the range 0-7.
   *
   * @type {number}
   */
  bitOffset;
  /**
   * The raw bytes that hold this bit array's data.
   *
   * If `bitOffset` is not zero then there are unused high bits in the first
   * byte of this buffer.
   *
   * If `bitOffset + bitSize` is not a multiple of 8 then there are unused low
   * bits in the last byte of this buffer.
   *
   * @type {Uint8Array}
   */
  rawBuffer;
  /**
   * Constructs a new bit array from a `Uint8Array`, an optional size in
   * bits, and an optional bit offset.
   *
   * If no bit size is specified it is taken as `buffer.length * 8`, i.e. all
   * bytes in the buffer make up the new bit array's data.
   *
   * If no bit offset is specified it defaults to zero, i.e. there are no unused
   * high bits in the first byte of the buffer.
   *
   * @param {Uint8Array} buffer
   * @param {number} [bitSize]
   * @param {number} [bitOffset]
   */
  constructor(buffer, bitSize, bitOffset) {
    if (!(buffer instanceof Uint8Array)) {
      throw globalThis.Error(
        "BitArray can only be constructed from a Uint8Array"
      );
    }
    this.bitSize = bitSize ?? buffer.length * 8;
    this.byteSize = Math.trunc((this.bitSize + 7) / 8);
    this.bitOffset = bitOffset ?? 0;
    if (this.bitSize < 0) {
      throw globalThis.Error(`BitArray bit size is invalid: ${this.bitSize}`);
    }
    if (this.bitOffset < 0 || this.bitOffset > 7) {
      throw globalThis.Error(
        `BitArray bit offset is invalid: ${this.bitOffset}`
      );
    }
    if (buffer.length !== Math.trunc((this.bitOffset + this.bitSize + 7) / 8)) {
      throw globalThis.Error("BitArray buffer length is invalid");
    }
    this.rawBuffer = buffer;
  }
  /**
   * Returns a specific byte in this bit array. If the byte index is out of
   * range then `undefined` is returned.
   *
   * When returning the final byte of a bit array with a bit size that's not a
   * multiple of 8, the content of the unused low bits are undefined.
   *
   * @param {number} index
   * @returns {number | undefined}
   */
  byteAt(index3) {
    if (index3 < 0 || index3 >= this.byteSize) {
      return void 0;
    }
    return bitArrayByteAt(this.rawBuffer, this.bitOffset, index3);
  }
  /** @internal */
  equals(other) {
    if (this.bitSize !== other.bitSize) {
      return false;
    }
    const wholeByteCount = Math.trunc(this.bitSize / 8);
    if (this.bitOffset === 0 && other.bitOffset === 0) {
      for (let i = 0; i < wholeByteCount; i++) {
        if (this.rawBuffer[i] !== other.rawBuffer[i]) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (this.rawBuffer[wholeByteCount] >> unusedLowBitCount !== other.rawBuffer[wholeByteCount] >> unusedLowBitCount) {
          return false;
        }
      }
    } else {
      for (let i = 0; i < wholeByteCount; i++) {
        const a = bitArrayByteAt(this.rawBuffer, this.bitOffset, i);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, i);
        if (a !== b) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const a = bitArrayByteAt(
          this.rawBuffer,
          this.bitOffset,
          wholeByteCount
        );
        const b = bitArrayByteAt(
          other.rawBuffer,
          other.bitOffset,
          wholeByteCount
        );
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (a >> unusedLowBitCount !== b >> unusedLowBitCount) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Returns this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.byteAt()` or `BitArray.rawBuffer` instead.
   *
   * @returns {Uint8Array}
   */
  get buffer() {
    bitArrayPrintDeprecationWarning(
      "buffer",
      "Use BitArray.byteAt() or BitArray.rawBuffer instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.buffer does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer;
  }
  /**
   * Returns the length in bytes of this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.bitSize` or `BitArray.byteSize` instead.
   *
   * @returns {number}
   */
  get length() {
    bitArrayPrintDeprecationWarning(
      "length",
      "Use BitArray.bitSize or BitArray.byteSize instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.length does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer.length;
  }
};
function bitArrayByteAt(buffer, bitOffset, index3) {
  if (bitOffset === 0) {
    return buffer[index3] ?? 0;
  } else {
    const a = buffer[index3] << bitOffset & 255;
    const b = buffer[index3 + 1] >> 8 - bitOffset;
    return a | b;
  }
}
var isBitArrayDeprecationMessagePrinted = {};
function bitArrayPrintDeprecationWarning(name, message) {
  if (isBitArrayDeprecationMessagePrinted[name]) {
    return;
  }
  console.warn(
    `Deprecated BitArray.${name} property used in JavaScript FFI code. ${message}.`
  );
  isBitArrayDeprecationMessagePrinted[name] = true;
}
var Result = class _Result extends CustomType {
  // @internal
  static isResult(data) {
    return data instanceof _Result;
  }
};
var Ok = class extends Result {
  constructor(value) {
    super();
    this[0] = value;
  }
  // @internal
  isOk() {
    return true;
  }
};
var Error = class extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  // @internal
  isOk() {
    return false;
  }
};
function isEqual(x, y) {
  let values2 = [x, y];
  while (values2.length) {
    let a = values2.pop();
    let b = values2.pop();
    if (a === b)
      continue;
    if (!isObject(a) || !isObject(b))
      return false;
    let unequal = !structurallyCompatibleObjects(a, b) || unequalDates(a, b) || unequalBuffers(a, b) || unequalArrays(a, b) || unequalMaps(a, b) || unequalSets(a, b) || unequalRegExps(a, b);
    if (unequal)
      return false;
    const proto = Object.getPrototypeOf(a);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a.equals(b))
          continue;
        else
          return false;
      } catch {
      }
    }
    let [keys2, get] = getters(a);
    for (let k of keys2(a)) {
      values2.push(get(a, k), get(b, k));
    }
  }
  return true;
}
function getters(object3) {
  if (object3 instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object3 instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a, b) {
  return a instanceof Date && (a > b || a < b);
}
function unequalBuffers(a, b) {
  return !(a instanceof BitArray) && a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT && !(a.byteLength === b.byteLength && a.every((n, i) => n === b[i]));
}
function unequalArrays(a, b) {
  return Array.isArray(a) && a.length !== b.length;
}
function unequalMaps(a, b) {
  return a instanceof Map && a.size !== b.size;
}
function unequalSets(a, b) {
  return a instanceof Set && (a.size != b.size || [...a].some((e) => !b.has(e)));
}
function unequalRegExps(a, b) {
  return a instanceof RegExp && (a.source !== b.source || a.flags !== b.flags);
}
function isObject(a) {
  return typeof a === "object" && a !== null;
}
function structurallyCompatibleObjects(a, b) {
  if (typeof a !== "object" && typeof b !== "object" && (!a || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a instanceof c))
    return false;
  return a.constructor === b.constructor;
}
function makeError(variant, module, line, fn, message, extra) {
  let error = new globalThis.Error(message);
  error.gleam_error = variant;
  error.module = module;
  error.line = line;
  error.function = fn;
  error.fn = fn;
  for (let k in extra)
    error[k] = extra[k];
  return error;
}

// build/dev/javascript/gleam_stdlib/gleam/order.mjs
var Lt = class extends CustomType {
};
var Eq = class extends CustomType {
};
var Gt = class extends CustomType {
};

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
var None = class extends CustomType {
};

// build/dev/javascript/gleam_stdlib/gleam/dict.mjs
function insert(dict2, key, value) {
  return map_insert(key, value, dict2);
}
function reverse_and_concat(loop$remaining, loop$accumulator) {
  while (true) {
    let remaining = loop$remaining;
    let accumulator = loop$accumulator;
    if (remaining.hasLength(0)) {
      return accumulator;
    } else {
      let first2 = remaining.head;
      let rest = remaining.tail;
      loop$remaining = rest;
      loop$accumulator = prepend(first2, accumulator);
    }
  }
}
function do_keys_loop(loop$list, loop$acc) {
  while (true) {
    let list2 = loop$list;
    let acc = loop$acc;
    if (list2.hasLength(0)) {
      return reverse_and_concat(acc, toList([]));
    } else {
      let key = list2.head[0];
      let rest = list2.tail;
      loop$list = rest;
      loop$acc = prepend(key, acc);
    }
  }
}
function keys(dict2) {
  return do_keys_loop(map_to_list(dict2), toList([]));
}

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
function length_loop(loop$list, loop$count) {
  while (true) {
    let list2 = loop$list;
    let count = loop$count;
    if (list2.atLeastLength(1)) {
      let list$1 = list2.tail;
      loop$list = list$1;
      loop$count = count + 1;
    } else {
      return count;
    }
  }
}
function length(list2) {
  return length_loop(list2, 0);
}
function reverse_and_prepend(loop$prefix, loop$suffix) {
  while (true) {
    let prefix = loop$prefix;
    let suffix = loop$suffix;
    if (prefix.hasLength(0)) {
      return suffix;
    } else {
      let first$1 = prefix.head;
      let rest$1 = prefix.tail;
      loop$prefix = rest$1;
      loop$suffix = prepend(first$1, suffix);
    }
  }
}
function reverse(list2) {
  return reverse_and_prepend(list2, toList([]));
}
function filter_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list2 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list2.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list2.head;
      let rest$1 = list2.tail;
      let new_acc = (() => {
        let $ = fun(first$1);
        if ($) {
          return prepend(first$1, acc);
        } else {
          return acc;
        }
      })();
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = new_acc;
    }
  }
}
function filter(list2, predicate) {
  return filter_loop(list2, predicate, toList([]));
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list2 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list2.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list2.head;
      let rest$1 = list2.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map(list2, fun) {
  return map_loop(list2, fun, toList([]));
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first2 = loop$first;
    let second = loop$second;
    if (first2.hasLength(0)) {
      return second;
    } else {
      let first$1 = first2.head;
      let rest$1 = first2.tail;
      loop$first = rest$1;
      loop$second = prepend(first$1, second);
    }
  }
}
function append(first2, second) {
  return append_loop(reverse(first2), second);
}
function fold(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list2 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list2.hasLength(0)) {
      return initial;
    } else {
      let first$1 = list2.head;
      let rest$1 = list2.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, first$1);
      loop$fun = fun;
    }
  }
}
function index_fold_loop(loop$over, loop$acc, loop$with, loop$index) {
  while (true) {
    let over = loop$over;
    let acc = loop$acc;
    let with$ = loop$with;
    let index3 = loop$index;
    if (over.hasLength(0)) {
      return acc;
    } else {
      let first$1 = over.head;
      let rest$1 = over.tail;
      loop$over = rest$1;
      loop$acc = with$(acc, first$1, index3);
      loop$with = with$;
      loop$index = index3 + 1;
    }
  }
}
function index_fold(list2, initial, fun) {
  return index_fold_loop(list2, initial, fun, 0);
}
function range_loop(loop$start, loop$stop, loop$acc) {
  while (true) {
    let start3 = loop$start;
    let stop = loop$stop;
    let acc = loop$acc;
    let $ = compare2(start3, stop);
    if ($ instanceof Eq) {
      return prepend(stop, acc);
    } else if ($ instanceof Gt) {
      loop$start = start3;
      loop$stop = stop + 1;
      loop$acc = prepend(stop, acc);
    } else {
      loop$start = start3;
      loop$stop = stop - 1;
      loop$acc = prepend(stop, acc);
    }
  }
}
function range(start3, stop) {
  return range_loop(start3, stop, toList([]));
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function drop_start(loop$string, loop$num_graphemes) {
  while (true) {
    let string4 = loop$string;
    let num_graphemes = loop$num_graphemes;
    let $ = num_graphemes > 0;
    if (!$) {
      return string4;
    } else {
      let $1 = pop_grapheme(string4);
      if ($1.isOk()) {
        let string$1 = $1[0][1];
        loop$string = string$1;
        loop$num_graphemes = num_graphemes - 1;
      } else {
        return string4;
      }
    }
  }
}

// build/dev/javascript/gleam_stdlib/dict.mjs
var referenceMap = /* @__PURE__ */ new WeakMap();
var tempDataView = /* @__PURE__ */ new DataView(
  /* @__PURE__ */ new ArrayBuffer(8)
);
var referenceUID = 0;
function hashByReference(o) {
  const known = referenceMap.get(o);
  if (known !== void 0) {
    return known;
  }
  const hash = referenceUID++;
  if (referenceUID === 2147483647) {
    referenceUID = 0;
  }
  referenceMap.set(o, hash);
  return hash;
}
function hashMerge(a, b) {
  return a ^ b + 2654435769 + (a << 6) + (a >> 2) | 0;
}
function hashString(s) {
  let hash = 0;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i) | 0;
  }
  return hash;
}
function hashNumber(n) {
  tempDataView.setFloat64(0, n);
  const i = tempDataView.getInt32(0);
  const j = tempDataView.getInt32(4);
  return Math.imul(73244475, i >> 16 ^ i) ^ j;
}
function hashBigInt(n) {
  return hashString(n.toString());
}
function hashObject(o) {
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && typeof proto.hashCode === "function") {
    try {
      const code = o.hashCode(o);
      if (typeof code === "number") {
        return code;
      }
    } catch {
    }
  }
  if (o instanceof Promise || o instanceof WeakSet || o instanceof WeakMap) {
    return hashByReference(o);
  }
  if (o instanceof Date) {
    return hashNumber(o.getTime());
  }
  let h = 0;
  if (o instanceof ArrayBuffer) {
    o = new Uint8Array(o);
  }
  if (Array.isArray(o) || o instanceof Uint8Array) {
    for (let i = 0; i < o.length; i++) {
      h = Math.imul(31, h) + getHash(o[i]) | 0;
    }
  } else if (o instanceof Set) {
    o.forEach((v) => {
      h = h + getHash(v) | 0;
    });
  } else if (o instanceof Map) {
    o.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
  } else {
    const keys2 = Object.keys(o);
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      const v = o[k];
      h = h + hashMerge(getHash(v), hashString(k)) | 0;
    }
  }
  return h;
}
function getHash(u) {
  if (u === null)
    return 1108378658;
  if (u === void 0)
    return 1108378659;
  if (u === true)
    return 1108378657;
  if (u === false)
    return 1108378656;
  switch (typeof u) {
    case "number":
      return hashNumber(u);
    case "string":
      return hashString(u);
    case "bigint":
      return hashBigInt(u);
    case "object":
      return hashObject(u);
    case "symbol":
      return hashByReference(u);
    case "function":
      return hashByReference(u);
    default:
      return 0;
  }
}
var SHIFT = 5;
var BUCKET_SIZE = Math.pow(2, SHIFT);
var MASK = BUCKET_SIZE - 1;
var MAX_INDEX_NODE = BUCKET_SIZE / 2;
var MIN_ARRAY_NODE = BUCKET_SIZE / 4;
var ENTRY = 0;
var ARRAY_NODE = 1;
var INDEX_NODE = 2;
var COLLISION_NODE = 3;
var EMPTY = {
  type: INDEX_NODE,
  bitmap: 0,
  array: []
};
function mask(hash, shift) {
  return hash >>> shift & MASK;
}
function bitpos(hash, shift) {
  return 1 << mask(hash, shift);
}
function bitcount(x) {
  x -= x >> 1 & 1431655765;
  x = (x & 858993459) + (x >> 2 & 858993459);
  x = x + (x >> 4) & 252645135;
  x += x >> 8;
  x += x >> 16;
  return x & 127;
}
function index(bitmap, bit) {
  return bitcount(bitmap & bit - 1);
}
function cloneAndSet(arr, at, val) {
  const len = arr.length;
  const out = new Array(len);
  for (let i = 0; i < len; ++i) {
    out[i] = arr[i];
  }
  out[at] = val;
  return out;
}
function spliceIn(arr, at, val) {
  const len = arr.length;
  const out = new Array(len + 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  out[g++] = val;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function spliceOut(arr, at) {
  const len = arr.length;
  const out = new Array(len - 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  ++i;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function createNode(shift, key1, val1, key2hash, key2, val2) {
  const key1hash = getHash(key1);
  if (key1hash === key2hash) {
    return {
      type: COLLISION_NODE,
      hash: key1hash,
      array: [
        { type: ENTRY, k: key1, v: val1 },
        { type: ENTRY, k: key2, v: val2 }
      ]
    };
  }
  const addedLeaf = { val: false };
  return assoc(
    assocIndex(EMPTY, shift, key1hash, key1, val1, addedLeaf),
    shift,
    key2hash,
    key2,
    val2,
    addedLeaf
  );
}
function assoc(root, shift, hash, key, val, addedLeaf) {
  switch (root.type) {
    case ARRAY_NODE:
      return assocArray(root, shift, hash, key, val, addedLeaf);
    case INDEX_NODE:
      return assocIndex(root, shift, hash, key, val, addedLeaf);
    case COLLISION_NODE:
      return assocCollision(root, shift, hash, key, val, addedLeaf);
  }
}
function assocArray(root, shift, hash, key, val, addedLeaf) {
  const idx = mask(hash, shift);
  const node = root.array[idx];
  if (node === void 0) {
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root.size + 1,
      array: cloneAndSet(root.array, idx, { type: ENTRY, k: key, v: val })
    };
  }
  if (node.type === ENTRY) {
    if (isEqual(key, node.k)) {
      if (val === node.v) {
        return root;
      }
      return {
        type: ARRAY_NODE,
        size: root.size,
        array: cloneAndSet(root.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root.size,
      array: cloneAndSet(
        root.array,
        idx,
        createNode(shift + SHIFT, node.k, node.v, hash, key, val)
      )
    };
  }
  const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
  if (n === node) {
    return root;
  }
  return {
    type: ARRAY_NODE,
    size: root.size,
    array: cloneAndSet(root.array, idx, n)
  };
}
function assocIndex(root, shift, hash, key, val, addedLeaf) {
  const bit = bitpos(hash, shift);
  const idx = index(root.bitmap, bit);
  if ((root.bitmap & bit) !== 0) {
    const node = root.array[idx];
    if (node.type !== ENTRY) {
      const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
      if (n === node) {
        return root;
      }
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap,
        array: cloneAndSet(root.array, idx, n)
      };
    }
    const nodeKey = node.k;
    if (isEqual(key, nodeKey)) {
      if (val === node.v) {
        return root;
      }
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap,
        array: cloneAndSet(root.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: INDEX_NODE,
      bitmap: root.bitmap,
      array: cloneAndSet(
        root.array,
        idx,
        createNode(shift + SHIFT, nodeKey, node.v, hash, key, val)
      )
    };
  } else {
    const n = root.array.length;
    if (n >= MAX_INDEX_NODE) {
      const nodes = new Array(32);
      const jdx = mask(hash, shift);
      nodes[jdx] = assocIndex(EMPTY, shift + SHIFT, hash, key, val, addedLeaf);
      let j = 0;
      let bitmap = root.bitmap;
      for (let i = 0; i < 32; i++) {
        if ((bitmap & 1) !== 0) {
          const node = root.array[j++];
          nodes[i] = node;
        }
        bitmap = bitmap >>> 1;
      }
      return {
        type: ARRAY_NODE,
        size: n + 1,
        array: nodes
      };
    } else {
      const newArray = spliceIn(root.array, idx, {
        type: ENTRY,
        k: key,
        v: val
      });
      addedLeaf.val = true;
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap | bit,
        array: newArray
      };
    }
  }
}
function assocCollision(root, shift, hash, key, val, addedLeaf) {
  if (hash === root.hash) {
    const idx = collisionIndexOf(root, key);
    if (idx !== -1) {
      const entry = root.array[idx];
      if (entry.v === val) {
        return root;
      }
      return {
        type: COLLISION_NODE,
        hash,
        array: cloneAndSet(root.array, idx, { type: ENTRY, k: key, v: val })
      };
    }
    const size = root.array.length;
    addedLeaf.val = true;
    return {
      type: COLLISION_NODE,
      hash,
      array: cloneAndSet(root.array, size, { type: ENTRY, k: key, v: val })
    };
  }
  return assoc(
    {
      type: INDEX_NODE,
      bitmap: bitpos(root.hash, shift),
      array: [root]
    },
    shift,
    hash,
    key,
    val,
    addedLeaf
  );
}
function collisionIndexOf(root, key) {
  const size = root.array.length;
  for (let i = 0; i < size; i++) {
    if (isEqual(key, root.array[i].k)) {
      return i;
    }
  }
  return -1;
}
function find(root, shift, hash, key) {
  switch (root.type) {
    case ARRAY_NODE:
      return findArray(root, shift, hash, key);
    case INDEX_NODE:
      return findIndex(root, shift, hash, key);
    case COLLISION_NODE:
      return findCollision(root, key);
  }
}
function findArray(root, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root.array[idx];
  if (node === void 0) {
    return void 0;
  }
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findIndex(root, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root.bitmap & bit) === 0) {
    return void 0;
  }
  const idx = index(root.bitmap, bit);
  const node = root.array[idx];
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findCollision(root, key) {
  const idx = collisionIndexOf(root, key);
  if (idx < 0) {
    return void 0;
  }
  return root.array[idx];
}
function without(root, shift, hash, key) {
  switch (root.type) {
    case ARRAY_NODE:
      return withoutArray(root, shift, hash, key);
    case INDEX_NODE:
      return withoutIndex(root, shift, hash, key);
    case COLLISION_NODE:
      return withoutCollision(root, key);
  }
}
function withoutArray(root, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root.array[idx];
  if (node === void 0) {
    return root;
  }
  let n = void 0;
  if (node.type === ENTRY) {
    if (!isEqual(node.k, key)) {
      return root;
    }
  } else {
    n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root;
    }
  }
  if (n === void 0) {
    if (root.size <= MIN_ARRAY_NODE) {
      const arr = root.array;
      const out = new Array(root.size - 1);
      let i = 0;
      let j = 0;
      let bitmap = 0;
      while (i < idx) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      ++i;
      while (i < arr.length) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      return {
        type: INDEX_NODE,
        bitmap,
        array: out
      };
    }
    return {
      type: ARRAY_NODE,
      size: root.size - 1,
      array: cloneAndSet(root.array, idx, n)
    };
  }
  return {
    type: ARRAY_NODE,
    size: root.size,
    array: cloneAndSet(root.array, idx, n)
  };
}
function withoutIndex(root, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root.bitmap & bit) === 0) {
    return root;
  }
  const idx = index(root.bitmap, bit);
  const node = root.array[idx];
  if (node.type !== ENTRY) {
    const n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root;
    }
    if (n !== void 0) {
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap,
        array: cloneAndSet(root.array, idx, n)
      };
    }
    if (root.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root.bitmap ^ bit,
      array: spliceOut(root.array, idx)
    };
  }
  if (isEqual(key, node.k)) {
    if (root.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root.bitmap ^ bit,
      array: spliceOut(root.array, idx)
    };
  }
  return root;
}
function withoutCollision(root, key) {
  const idx = collisionIndexOf(root, key);
  if (idx < 0) {
    return root;
  }
  if (root.array.length === 1) {
    return void 0;
  }
  return {
    type: COLLISION_NODE,
    hash: root.hash,
    array: spliceOut(root.array, idx)
  };
}
function forEach(root, fn) {
  if (root === void 0) {
    return;
  }
  const items = root.array;
  const size = items.length;
  for (let i = 0; i < size; i++) {
    const item = items[i];
    if (item === void 0) {
      continue;
    }
    if (item.type === ENTRY) {
      fn(item.v, item.k);
      continue;
    }
    forEach(item, fn);
  }
}
var Dict = class _Dict {
  /**
   * @template V
   * @param {Record<string,V>} o
   * @returns {Dict<string,V>}
   */
  static fromObject(o) {
    const keys2 = Object.keys(o);
    let m = _Dict.new();
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      m = m.set(k, o[k]);
    }
    return m;
  }
  /**
   * @template K,V
   * @param {Map<K,V>} o
   * @returns {Dict<K,V>}
   */
  static fromMap(o) {
    let m = _Dict.new();
    o.forEach((v, k) => {
      m = m.set(k, v);
    });
    return m;
  }
  static new() {
    return new _Dict(void 0, 0);
  }
  /**
   * @param {undefined | Node<K,V>} root
   * @param {number} size
   */
  constructor(root, size) {
    this.root = root;
    this.size = size;
  }
  /**
   * @template NotFound
   * @param {K} key
   * @param {NotFound} notFound
   * @returns {NotFound | V}
   */
  get(key, notFound) {
    if (this.root === void 0) {
      return notFound;
    }
    const found = find(this.root, 0, getHash(key), key);
    if (found === void 0) {
      return notFound;
    }
    return found.v;
  }
  /**
   * @param {K} key
   * @param {V} val
   * @returns {Dict<K,V>}
   */
  set(key, val) {
    const addedLeaf = { val: false };
    const root = this.root === void 0 ? EMPTY : this.root;
    const newRoot = assoc(root, 0, getHash(key), key, val, addedLeaf);
    if (newRoot === this.root) {
      return this;
    }
    return new _Dict(newRoot, addedLeaf.val ? this.size + 1 : this.size);
  }
  /**
   * @param {K} key
   * @returns {Dict<K,V>}
   */
  delete(key) {
    if (this.root === void 0) {
      return this;
    }
    const newRoot = without(this.root, 0, getHash(key), key);
    if (newRoot === this.root) {
      return this;
    }
    if (newRoot === void 0) {
      return _Dict.new();
    }
    return new _Dict(newRoot, this.size - 1);
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    if (this.root === void 0) {
      return false;
    }
    return find(this.root, 0, getHash(key), key) !== void 0;
  }
  /**
   * @returns {[K,V][]}
   */
  entries() {
    if (this.root === void 0) {
      return [];
    }
    const result = [];
    this.forEach((v, k) => result.push([k, v]));
    return result;
  }
  /**
   *
   * @param {(val:V,key:K)=>void} fn
   */
  forEach(fn) {
    forEach(this.root, fn);
  }
  hashCode() {
    let h = 0;
    this.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
    return h;
  }
  /**
   * @param {unknown} o
   * @returns {boolean}
   */
  equals(o) {
    if (!(o instanceof _Dict) || this.size !== o.size) {
      return false;
    }
    try {
      this.forEach((v, k) => {
        if (!isEqual(o.get(k, !v), v)) {
          throw unequalDictSymbol;
        }
      });
      return true;
    } catch (e) {
      if (e === unequalDictSymbol) {
        return false;
      }
      throw e;
    }
  }
};
var unequalDictSymbol = /* @__PURE__ */ Symbol();

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var Nil = void 0;
function identity(x) {
  return x;
}
function to_string(term) {
  return term.toString();
}
var segmenter = void 0;
function graphemes_iterator(string4) {
  if (globalThis.Intl && Intl.Segmenter) {
    segmenter ||= new Intl.Segmenter();
    return segmenter.segment(string4)[Symbol.iterator]();
  }
}
function pop_grapheme(string4) {
  let first2;
  const iterator = graphemes_iterator(string4);
  if (iterator) {
    first2 = iterator.next().value?.segment;
  } else {
    first2 = string4.match(/./su)?.[0];
  }
  if (first2) {
    return new Ok([first2, string4.slice(first2.length)]);
  } else {
    return new Error(Nil);
  }
}
var unicode_whitespaces = [
  " ",
  // Space
  "	",
  // Horizontal tab
  "\n",
  // Line feed
  "\v",
  // Vertical tab
  "\f",
  // Form feed
  "\r",
  // Carriage return
  "\x85",
  // Next line
  "\u2028",
  // Line separator
  "\u2029"
  // Paragraph separator
].join("");
var trim_start_regex = /* @__PURE__ */ new RegExp(
  `^[${unicode_whitespaces}]*`
);
var trim_end_regex = /* @__PURE__ */ new RegExp(`[${unicode_whitespaces}]*$`);
function console_log(term) {
  console.log(term);
}
function new_map() {
  return Dict.new();
}
function map_to_list(map4) {
  return List.fromArray(map4.entries());
}
function map_insert(key, value, map4) {
  return map4.set(key, value);
}

// build/dev/javascript/gleam_stdlib/gleam/int.mjs
function compare2(a, b) {
  let $ = a === b;
  if ($) {
    return new Eq();
  } else {
    let $1 = a < b;
    if ($1) {
      return new Lt();
    } else {
      return new Gt();
    }
  }
}

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(all) {
    super();
    this.all = all;
  }
};
function none() {
  return new Effect(toList([]));
}

// build/dev/javascript/lustre/lustre/internals/vdom.mjs
var Text = class extends CustomType {
  constructor(content) {
    super();
    this.content = content;
  }
};
var Element = class extends CustomType {
  constructor(key, namespace, tag, attrs, children2, self_closing, void$) {
    super();
    this.key = key;
    this.namespace = namespace;
    this.tag = tag;
    this.attrs = attrs;
    this.children = children2;
    this.self_closing = self_closing;
    this.void = void$;
  }
};
var Map2 = class extends CustomType {
  constructor(subtree) {
    super();
    this.subtree = subtree;
  }
};
var Attribute = class extends CustomType {
  constructor(x0, x1, as_property) {
    super();
    this[0] = x0;
    this[1] = x1;
    this.as_property = as_property;
  }
};
var Event = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
function attribute_to_event_handler(attribute2) {
  if (attribute2 instanceof Attribute) {
    return new Error(void 0);
  } else {
    let name = attribute2[0];
    let handler = attribute2[1];
    let name$1 = drop_start(name, 2);
    return new Ok([name$1, handler]);
  }
}
function do_element_list_handlers(elements2, handlers2, key) {
  return index_fold(
    elements2,
    handlers2,
    (handlers3, element2, index3) => {
      let key$1 = key + "-" + to_string(index3);
      return do_handlers(element2, handlers3, key$1);
    }
  );
}
function do_handlers(loop$element, loop$handlers, loop$key) {
  while (true) {
    let element2 = loop$element;
    let handlers2 = loop$handlers;
    let key = loop$key;
    if (element2 instanceof Text) {
      return handlers2;
    } else if (element2 instanceof Map2) {
      let subtree = element2.subtree;
      loop$element = subtree();
      loop$handlers = handlers2;
      loop$key = key;
    } else {
      let attrs = element2.attrs;
      let children2 = element2.children;
      let handlers$1 = fold(
        attrs,
        handlers2,
        (handlers3, attr) => {
          let $ = attribute_to_event_handler(attr);
          if ($.isOk()) {
            let name = $[0][0];
            let handler = $[0][1];
            return insert(handlers3, key + "-" + name, handler);
          } else {
            return handlers3;
          }
        }
      );
      return do_element_list_handlers(children2, handlers$1, key);
    }
  }
}
function handlers(element2) {
  return do_handlers(element2, new_map(), "0");
}

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute(name, value) {
  return new Attribute(name, identity(value), false);
}
function on(name, handler) {
  return new Event("on" + name, handler);
}
function class$(name) {
  return attribute("class", name);
}

// build/dev/javascript/lustre/lustre/element.mjs
function element(tag, attrs, children2) {
  if (tag === "area") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "base") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "br") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "col") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "embed") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "hr") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "img") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "input") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "link") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "meta") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "param") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "source") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "track") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "wbr") {
    return new Element("", "", tag, attrs, toList([]), false, true);
  } else {
    return new Element("", "", tag, attrs, children2, false, false);
  }
}
function text(content) {
  return new Text(content);
}

// build/dev/javascript/gleam_stdlib/gleam/set.mjs
var Set2 = class extends CustomType {
  constructor(dict2) {
    super();
    this.dict = dict2;
  }
};
function new$2() {
  return new Set2(new_map());
}

// build/dev/javascript/lustre/lustre/internals/patch.mjs
var Diff = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Emit = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Init = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
function is_empty_element_diff(diff2) {
  return isEqual(diff2.created, new_map()) && isEqual(
    diff2.removed,
    new$2()
  ) && isEqual(diff2.updated, new_map());
}

// build/dev/javascript/lustre/lustre/internals/runtime.mjs
var Attrs = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Batch = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Debug = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Dispatch = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Emit2 = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Event2 = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Shutdown = class extends CustomType {
};
var Subscribe = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Unsubscribe = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var ForceModel = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};

// build/dev/javascript/lustre/vdom.ffi.mjs
if (globalThis.customElements && !globalThis.customElements.get("lustre-fragment")) {
  globalThis.customElements.define(
    "lustre-fragment",
    class LustreFragment extends HTMLElement {
      constructor() {
        super();
      }
    }
  );
}
function morph(prev, next, dispatch) {
  let out;
  let stack = [{ prev, next, parent: prev.parentNode }];
  while (stack.length) {
    let { prev: prev2, next: next2, parent } = stack.pop();
    while (next2.subtree !== void 0)
      next2 = next2.subtree();
    if (next2.content !== void 0) {
      if (!prev2) {
        const created = document.createTextNode(next2.content);
        parent.appendChild(created);
        out ??= created;
      } else if (prev2.nodeType === Node.TEXT_NODE) {
        if (prev2.textContent !== next2.content)
          prev2.textContent = next2.content;
        out ??= prev2;
      } else {
        const created = document.createTextNode(next2.content);
        parent.replaceChild(created, prev2);
        out ??= created;
      }
    } else if (next2.tag !== void 0) {
      const created = createElementNode({
        prev: prev2,
        next: next2,
        dispatch,
        stack
      });
      if (!prev2) {
        parent.appendChild(created);
      } else if (prev2 !== created) {
        parent.replaceChild(created, prev2);
      }
      out ??= created;
    }
  }
  return out;
}
function createElementNode({ prev, next, dispatch, stack }) {
  const namespace = next.namespace || "http://www.w3.org/1999/xhtml";
  const canMorph = prev && prev.nodeType === Node.ELEMENT_NODE && prev.localName === next.tag && prev.namespaceURI === (next.namespace || "http://www.w3.org/1999/xhtml");
  const el = canMorph ? prev : namespace ? document.createElementNS(namespace, next.tag) : document.createElement(next.tag);
  let handlersForEl;
  if (!registeredHandlers.has(el)) {
    const emptyHandlers = /* @__PURE__ */ new Map();
    registeredHandlers.set(el, emptyHandlers);
    handlersForEl = emptyHandlers;
  } else {
    handlersForEl = registeredHandlers.get(el);
  }
  const prevHandlers = canMorph ? new Set(handlersForEl.keys()) : null;
  const prevAttributes = canMorph ? new Set(Array.from(prev.attributes, (a) => a.name)) : null;
  let className = null;
  let style2 = null;
  let innerHTML = null;
  if (canMorph && next.tag === "textarea") {
    const innertText = next.children[Symbol.iterator]().next().value?.content;
    if (innertText !== void 0)
      el.value = innertText;
  }
  const delegated = [];
  for (const attr of next.attrs) {
    const name = attr[0];
    const value = attr[1];
    if (attr.as_property) {
      if (el[name] !== value)
        el[name] = value;
      if (canMorph)
        prevAttributes.delete(name);
    } else if (name.startsWith("on")) {
      const eventName = name.slice(2);
      const callback = dispatch(value, eventName === "input");
      if (!handlersForEl.has(eventName)) {
        el.addEventListener(eventName, lustreGenericEventHandler);
      }
      handlersForEl.set(eventName, callback);
      if (canMorph)
        prevHandlers.delete(eventName);
    } else if (name.startsWith("data-lustre-on-")) {
      const eventName = name.slice(15);
      const callback = dispatch(lustreServerEventHandler);
      if (!handlersForEl.has(eventName)) {
        el.addEventListener(eventName, lustreGenericEventHandler);
      }
      handlersForEl.set(eventName, callback);
      el.setAttribute(name, value);
      if (canMorph) {
        prevHandlers.delete(eventName);
        prevAttributes.delete(name);
      }
    } else if (name.startsWith("delegate:data-") || name.startsWith("delegate:aria-")) {
      el.setAttribute(name, value);
      delegated.push([name.slice(10), value]);
    } else if (name === "class") {
      className = className === null ? value : className + " " + value;
    } else if (name === "style") {
      style2 = style2 === null ? value : style2 + value;
    } else if (name === "dangerous-unescaped-html") {
      innerHTML = value;
    } else {
      if (el.getAttribute(name) !== value)
        el.setAttribute(name, value);
      if (name === "value" || name === "selected")
        el[name] = value;
      if (canMorph)
        prevAttributes.delete(name);
    }
  }
  if (className !== null) {
    el.setAttribute("class", className);
    if (canMorph)
      prevAttributes.delete("class");
  }
  if (style2 !== null) {
    el.setAttribute("style", style2);
    if (canMorph)
      prevAttributes.delete("style");
  }
  if (canMorph) {
    for (const attr of prevAttributes) {
      el.removeAttribute(attr);
    }
    for (const eventName of prevHandlers) {
      handlersForEl.delete(eventName);
      el.removeEventListener(eventName, lustreGenericEventHandler);
    }
  }
  if (next.tag === "slot") {
    window.queueMicrotask(() => {
      for (const child of el.assignedElements()) {
        for (const [name, value] of delegated) {
          if (!child.hasAttribute(name)) {
            child.setAttribute(name, value);
          }
        }
      }
    });
  }
  if (next.key !== void 0 && next.key !== "") {
    el.setAttribute("data-lustre-key", next.key);
  } else if (innerHTML !== null) {
    el.innerHTML = innerHTML;
    return el;
  }
  let prevChild = el.firstChild;
  let seenKeys = null;
  let keyedChildren = null;
  let incomingKeyedChildren = null;
  let firstChild = children(next).next().value;
  if (canMorph && firstChild !== void 0 && // Explicit checks are more verbose but truthy checks force a bunch of comparisons
  // we don't care about: it's never gonna be a number etc.
  firstChild.key !== void 0 && firstChild.key !== "") {
    seenKeys = /* @__PURE__ */ new Set();
    keyedChildren = getKeyedChildren(prev);
    incomingKeyedChildren = getKeyedChildren(next);
    for (const child of children(next)) {
      prevChild = diffKeyedChild(
        prevChild,
        child,
        el,
        stack,
        incomingKeyedChildren,
        keyedChildren,
        seenKeys
      );
    }
  } else {
    for (const child of children(next)) {
      stack.unshift({ prev: prevChild, next: child, parent: el });
      prevChild = prevChild?.nextSibling;
    }
  }
  while (prevChild) {
    const next2 = prevChild.nextSibling;
    el.removeChild(prevChild);
    prevChild = next2;
  }
  return el;
}
var registeredHandlers = /* @__PURE__ */ new WeakMap();
function lustreGenericEventHandler(event2) {
  const target = event2.currentTarget;
  if (!registeredHandlers.has(target)) {
    target.removeEventListener(event2.type, lustreGenericEventHandler);
    return;
  }
  const handlersForEventTarget = registeredHandlers.get(target);
  if (!handlersForEventTarget.has(event2.type)) {
    target.removeEventListener(event2.type, lustreGenericEventHandler);
    return;
  }
  handlersForEventTarget.get(event2.type)(event2);
}
function lustreServerEventHandler(event2) {
  const el = event2.currentTarget;
  const tag = el.getAttribute(`data-lustre-on-${event2.type}`);
  const data = JSON.parse(el.getAttribute("data-lustre-data") || "{}");
  const include = JSON.parse(el.getAttribute("data-lustre-include") || "[]");
  switch (event2.type) {
    case "input":
    case "change":
      include.push("target.value");
      break;
  }
  return {
    tag,
    data: include.reduce(
      (data2, property) => {
        const path = property.split(".");
        for (let i = 0, o = data2, e = event2; i < path.length; i++) {
          if (i === path.length - 1) {
            o[path[i]] = e[path[i]];
          } else {
            o[path[i]] ??= {};
            e = e[path[i]];
            o = o[path[i]];
          }
        }
        return data2;
      },
      { data }
    )
  };
}
function getKeyedChildren(el) {
  const keyedChildren = /* @__PURE__ */ new Map();
  if (el) {
    for (const child of children(el)) {
      const key = child?.key || child?.getAttribute?.("data-lustre-key");
      if (key)
        keyedChildren.set(key, child);
    }
  }
  return keyedChildren;
}
function diffKeyedChild(prevChild, child, el, stack, incomingKeyedChildren, keyedChildren, seenKeys) {
  while (prevChild && !incomingKeyedChildren.has(prevChild.getAttribute("data-lustre-key"))) {
    const nextChild = prevChild.nextSibling;
    el.removeChild(prevChild);
    prevChild = nextChild;
  }
  if (keyedChildren.size === 0) {
    stack.unshift({ prev: prevChild, next: child, parent: el });
    prevChild = prevChild?.nextSibling;
    return prevChild;
  }
  if (seenKeys.has(child.key)) {
    console.warn(`Duplicate key found in Lustre vnode: ${child.key}`);
    stack.unshift({ prev: null, next: child, parent: el });
    return prevChild;
  }
  seenKeys.add(child.key);
  const keyedChild = keyedChildren.get(child.key);
  if (!keyedChild && !prevChild) {
    stack.unshift({ prev: null, next: child, parent: el });
    return prevChild;
  }
  if (!keyedChild && prevChild !== null) {
    const placeholder = document.createTextNode("");
    el.insertBefore(placeholder, prevChild);
    stack.unshift({ prev: placeholder, next: child, parent: el });
    return prevChild;
  }
  if (!keyedChild || keyedChild === prevChild) {
    stack.unshift({ prev: prevChild, next: child, parent: el });
    prevChild = prevChild?.nextSibling;
    return prevChild;
  }
  el.insertBefore(keyedChild, prevChild);
  stack.unshift({ prev: keyedChild, next: child, parent: el });
  return prevChild;
}
function* children(element2) {
  for (const child of element2.children) {
    yield* forceChild(child);
  }
}
function* forceChild(element2) {
  if (element2.subtree !== void 0) {
    yield* forceChild(element2.subtree());
  } else {
    yield element2;
  }
}

// build/dev/javascript/lustre/lustre.ffi.mjs
var LustreClientApplication = class _LustreClientApplication {
  /**
   * @template Flags
   *
   * @param {object} app
   * @param {(flags: Flags) => [Model, Lustre.Effect<Msg>]} app.init
   * @param {(msg: Msg, model: Model) => [Model, Lustre.Effect<Msg>]} app.update
   * @param {(model: Model) => Lustre.Element<Msg>} app.view
   * @param {string | HTMLElement} selector
   * @param {Flags} flags
   *
   * @returns {Gleam.Ok<(action: Lustre.Action<Lustre.Client, Msg>>) => void>}
   */
  static start({ init: init3, update: update2, view: view2 }, selector, flags) {
    if (!is_browser())
      return new Error(new NotABrowser());
    const root = selector instanceof HTMLElement ? selector : document.querySelector(selector);
    if (!root)
      return new Error(new ElementNotFound(selector));
    const app = new _LustreClientApplication(root, init3(flags), update2, view2);
    return new Ok((action) => app.send(action));
  }
  /**
   * @param {Element} root
   * @param {[Model, Lustre.Effect<Msg>]} init
   * @param {(model: Model, msg: Msg) => [Model, Lustre.Effect<Msg>]} update
   * @param {(model: Model) => Lustre.Element<Msg>} view
   *
   * @returns {LustreClientApplication}
   */
  constructor(root, [init3, effects], update2, view2) {
    this.root = root;
    this.#model = init3;
    this.#update = update2;
    this.#view = view2;
    this.#tickScheduled = window.setTimeout(
      () => this.#tick(effects.all.toArray(), true),
      0
    );
  }
  /** @type {Element} */
  root;
  /**
   * @param {Lustre.Action<Lustre.Client, Msg>} action
   *
   * @returns {void}
   */
  send(action) {
    if (action instanceof Debug) {
      if (action[0] instanceof ForceModel) {
        this.#tickScheduled = window.clearTimeout(this.#tickScheduled);
        this.#queue = [];
        this.#model = action[0][0];
        const vdom = this.#view(this.#model);
        const dispatch = (handler, immediate = false) => (event2) => {
          const result = handler(event2);
          if (result instanceof Ok) {
            this.send(new Dispatch(result[0], immediate));
          }
        };
        const prev = this.root.firstChild ?? this.root.appendChild(document.createTextNode(""));
        morph(prev, vdom, dispatch);
      }
    } else if (action instanceof Dispatch) {
      const msg = action[0];
      const immediate = action[1] ?? false;
      this.#queue.push(msg);
      if (immediate) {
        this.#tickScheduled = window.clearTimeout(this.#tickScheduled);
        this.#tick();
      } else if (!this.#tickScheduled) {
        this.#tickScheduled = window.setTimeout(() => this.#tick());
      }
    } else if (action instanceof Emit2) {
      const event2 = action[0];
      const data = action[1];
      this.root.dispatchEvent(
        new CustomEvent(event2, {
          detail: data,
          bubbles: true,
          composed: true
        })
      );
    } else if (action instanceof Shutdown) {
      this.#tickScheduled = window.clearTimeout(this.#tickScheduled);
      this.#model = null;
      this.#update = null;
      this.#view = null;
      this.#queue = null;
      while (this.root.firstChild) {
        this.root.firstChild.remove();
      }
    }
  }
  /** @type {Model} */
  #model;
  /** @type {(model: Model, msg: Msg) => [Model, Lustre.Effect<Msg>]} */
  #update;
  /** @type {(model: Model) => Lustre.Element<Msg>} */
  #view;
  /** @type {Array<Msg>} */
  #queue = [];
  /** @type {number | undefined} */
  #tickScheduled;
  /**
   * @param {Lustre.Effect<Msg>[]} effects
   */
  #tick(effects = []) {
    this.#tickScheduled = void 0;
    this.#flush(effects);
    const vdom = this.#view(this.#model);
    const dispatch = (handler, immediate = false) => (event2) => {
      const result = handler(event2);
      if (result instanceof Ok) {
        this.send(new Dispatch(result[0], immediate));
      }
    };
    const prev = this.root.firstChild ?? this.root.appendChild(document.createTextNode(""));
    morph(prev, vdom, dispatch);
  }
  #flush(effects = []) {
    while (this.#queue.length > 0) {
      const msg = this.#queue.shift();
      const [next, effect] = this.#update(this.#model, msg);
      effects = effects.concat(effect.all.toArray());
      this.#model = next;
    }
    while (effects.length > 0) {
      const effect = effects.shift();
      const dispatch = (msg) => this.send(new Dispatch(msg));
      const emit2 = (event2, data) => this.root.dispatchEvent(
        new CustomEvent(event2, {
          detail: data,
          bubbles: true,
          composed: true
        })
      );
      const select = () => {
      };
      const root = this.root;
      effect({ dispatch, emit: emit2, select, root });
    }
    if (this.#queue.length > 0) {
      this.#flush(effects);
    }
  }
};
var start = LustreClientApplication.start;
var LustreServerApplication = class _LustreServerApplication {
  static start({ init: init3, update: update2, view: view2, on_attribute_change }, flags) {
    const app = new _LustreServerApplication(
      init3(flags),
      update2,
      view2,
      on_attribute_change
    );
    return new Ok((action) => app.send(action));
  }
  constructor([model, effects], update2, view2, on_attribute_change) {
    this.#model = model;
    this.#update = update2;
    this.#view = view2;
    this.#html = view2(model);
    this.#onAttributeChange = on_attribute_change;
    this.#renderers = /* @__PURE__ */ new Map();
    this.#handlers = handlers(this.#html);
    this.#tick(effects.all.toArray());
  }
  send(action) {
    if (action instanceof Attrs) {
      for (const attr of action[0]) {
        const decoder = this.#onAttributeChange.get(attr[0]);
        if (!decoder)
          continue;
        const msg = decoder(attr[1]);
        if (msg instanceof Error)
          continue;
        this.#queue.push(msg);
      }
      this.#tick();
    } else if (action instanceof Batch) {
      this.#queue = this.#queue.concat(action[0].toArray());
      this.#tick(action[1].all.toArray());
    } else if (action instanceof Debug) {
    } else if (action instanceof Dispatch) {
      this.#queue.push(action[0]);
      this.#tick();
    } else if (action instanceof Emit2) {
      const event2 = new Emit(action[0], action[1]);
      for (const [_, renderer] of this.#renderers) {
        renderer(event2);
      }
    } else if (action instanceof Event2) {
      const handler = this.#handlers.get(action[0]);
      if (!handler)
        return;
      const msg = handler(action[1]);
      if (msg instanceof Error)
        return;
      this.#queue.push(msg[0]);
      this.#tick();
    } else if (action instanceof Subscribe) {
      const attrs = keys(this.#onAttributeChange);
      const patch = new Init(attrs, this.#html);
      this.#renderers = this.#renderers.set(action[0], action[1]);
      action[1](patch);
    } else if (action instanceof Unsubscribe) {
      this.#renderers = this.#renderers.delete(action[0]);
    }
  }
  #model;
  #update;
  #queue;
  #view;
  #html;
  #renderers;
  #handlers;
  #onAttributeChange;
  #tick(effects = []) {
    this.#flush(effects);
    const vdom = this.#view(this.#model);
    const diff2 = elements(this.#html, vdom);
    if (!is_empty_element_diff(diff2)) {
      const patch = new Diff(diff2);
      for (const [_, renderer] of this.#renderers) {
        renderer(patch);
      }
    }
    this.#html = vdom;
    this.#handlers = diff2.handlers;
  }
  #flush(effects = []) {
    while (this.#queue.length > 0) {
      const msg = this.#queue.shift();
      const [next, effect] = this.#update(this.#model, msg);
      effects = effects.concat(effect.all.toArray());
      this.#model = next;
    }
    while (effects.length > 0) {
      const effect = effects.shift();
      const dispatch = (msg) => this.send(new Dispatch(msg));
      const emit2 = (event2, data) => this.root.dispatchEvent(
        new CustomEvent(event2, {
          detail: data,
          bubbles: true,
          composed: true
        })
      );
      const select = () => {
      };
      const root = null;
      effect({ dispatch, emit: emit2, select, root });
    }
    if (this.#queue.length > 0) {
      this.#flush(effects);
    }
  }
};
var start_server_application = LustreServerApplication.start;
var is_browser = () => globalThis.window && window.document;

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init3, update2, view2, on_attribute_change) {
    super();
    this.init = init3;
    this.update = update2;
    this.view = view2;
    this.on_attribute_change = on_attribute_change;
  }
};
var ElementNotFound = class extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
};
var NotABrowser = class extends CustomType {
};
function application(init3, update2, view2) {
  return new App(init3, update2, view2, new None());
}
function simple(init3, update2, view2) {
  let init$1 = (flags) => {
    return [init3(flags), none()];
  };
  let update$1 = (model, msg) => {
    return [update2(model, msg), none()];
  };
  return application(init$1, update$1, view2);
}
function start2(app, selector, flags) {
  return guard(
    !is_browser(),
    new Error(new NotABrowser()),
    () => {
      return start(app, selector, flags);
    }
  );
}

// build/dev/javascript/lustre/lustre/element/html.mjs
function text2(content) {
  return text(content);
}
function header(attrs, children2) {
  return element("header", attrs, children2);
}
function h1(attrs, children2) {
  return element("h1", attrs, children2);
}
function h2(attrs, children2) {
  return element("h2", attrs, children2);
}
function h3(attrs, children2) {
  return element("h3", attrs, children2);
}
function div(attrs, children2) {
  return element("div", attrs, children2);
}
function p(attrs, children2) {
  return element("p", attrs, children2);
}
function span(attrs, children2) {
  return element("span", attrs, children2);
}
function button(attrs, children2) {
  return element("button", attrs, children2);
}

// build/dev/javascript/lustre/lustre/event.mjs
function on2(name, handler) {
  return on(name, handler);
}
function on_click(msg) {
  return on2("click", (_) => {
    return new Ok(msg);
  });
}

// build/dev/javascript/client/client.mjs
var Model2 = class extends CustomType {
  constructor(count, view_mode, users, useronedrafted, usertwodrafted, userthreedrafted, userfourdrafted, players, playernumber, draftpick, direction) {
    super();
    this.count = count;
    this.view_mode = view_mode;
    this.users = users;
    this.useronedrafted = useronedrafted;
    this.usertwodrafted = usertwodrafted;
    this.userthreedrafted = userthreedrafted;
    this.userfourdrafted = userfourdrafted;
    this.players = players;
    this.playernumber = playernumber;
    this.draftpick = draftpick;
    this.direction = direction;
  }
};
var TeamView = class extends CustomType {
};
var Draft = class extends CustomType {
};
var Player = class extends CustomType {
  constructor(firstname, lastname, position, team, adp) {
    super();
    this.firstname = firstname;
    this.lastname = lastname;
    this.position = position;
    this.team = team;
    this.adp = adp;
  }
};
var Forward = class extends CustomType {
};
var Backward = class extends CustomType {
};
var ToggleView = class extends CustomType {
};
var IncrementPlayerNumber = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
function init2(_) {
  return new Model2(
    0,
    new Draft(),
    toList(["Nate", "Josh", "Sam", "Ethan"]),
    toList([]),
    toList([]),
    toList([]),
    toList([]),
    toList([
      new Player("Justin", "Jefferson", "WR", "MIN", 1),
      new Player("Ja'Marr", "Chase", "WR", "CIN", 2),
      new Player("CeeDee ", "Lamb", "WR", "DAL", 3),
      new Player("Bijan", "Robinson", "RB", "ATL", 4),
      new Player("Josh", "Allen", "QB", "BUF", 5),
      new Player("Saquon", "Barkley", "RB", "PHI", 6),
      new Player("Amon-Ra", "St. Brown", "WR", "DET", 7),
      new Player("Jahmyr", "Gibbs", "RB", "DET", 8),
      new Player("Patrick", "Mahomes", "QB", "KC", 9),
      new Player("Puka", "Nacua", "WR", "LAR", 10),
      new Player("AJ", "Brown", "WR", "PHI", 11),
      new Player("Lamar", "Jackson", "QB", "BAL", 12),
      new Player("Nico", "Collins", "WR", "HOU", 13),
      new Player("Jalen", "Hurts", "QB", "PHI", 14),
      new Player("Justin", "Herbert", "QB", "LAC", 15),
      new Player("C.J.", "Stroud", "QB", "HOU", 16),
      new Player("Travis", "Kelce", "TE", "KC", 17),
      new Player("Sam", "LaPorta", "TE", "DET", 18),
      new Player("Josh", "Jacobs", "RB", "GB", 19),
      new Player("Joe", "Mixon", "RB", "HOU", 20),
      new Player("Cooper", "Kupp", "WR", "LAR", 21),
      new Player("T.J.", "Hockenson", "TE", "MIN", 22),
      new Player("Derrick", "Henry", "RB", "BAL", 23),
      new Player("Tee", "Higgins", "WR", "CIN", 24),
      new Player("George", "Pickens", "WR", "PIT", 25),
      new Player("Terry", "McLaurin", "WR", "WAS", 26),
      new Player("Mike", "Evans", "WR", "TB", 27),
      new Player("Jordan", "Love", "QB", "GB", 28),
      new Player("Zay", "Flowers", "WR", "BAL", 29),
      new Player("Jared", "Goff", "QB", "DET", 30),
      new Player("Joe", "Burrow", "QB", "CIN", 31),
      new Player("Jordan", "Addison", "WR", "MIN", 32),
      new Player("Kyren", "Williams", "RB", "LAR", 33),
      new Player("James", "Cook", "RB", "BUF", 34),
      new Player("Christian", "Watson", "WR", "GB", 35),
      new Player("Jameson", "Williams", "WR", "DET", 36),
      new Player("Dallas", "Goedert", "TE", "PHI", 37),
      new Player("Matthew", "Stafford", "QB", "LAR", 38),
      new Player("Xavier", "Worthy", "WR", "KC", 39),
      new Player("Jayden", "Daniels", "QB", "WAS", 40),
      new Player("Baker", "Mayfield", "QB", "TB", 41),
      new Player("Chase", "Brown", "RB", "CIN", 42),
      new Player("Khalil", "Shakir", "WR", "BUF", 43),
      new Player("Ladd", "McConkey", "WR", "LAC", 44),
      new Player("Sam", "Darnold", "QB", "MIN", 45),
      new Player("Bucky", "Iriving", "RB", "TB", 46)
    ]),
    1,
    0,
    new Forward()
  );
}
function get_drafted_list(model, playernumber) {
  if (playernumber === 1) {
    return model.useronedrafted;
  } else if (playernumber === 2) {
    return model.usertwodrafted;
  } else if (playernumber === 3) {
    return model.userthreedrafted;
  } else if (playernumber === 4) {
    return model.userfourdrafted;
  } else {
    return toList([]);
  }
}
function count_players(players, position) {
  let _pipe = players;
  let _pipe$1 = filter(
    _pipe,
    (player) => {
      return player.position === position;
    }
  );
  return length(_pipe$1);
}
function update(model, msg) {
  if (msg instanceof ToggleView) {
    let new_mode = (() => {
      let $ = model.view_mode;
      if ($ instanceof TeamView) {
        return new Draft();
      } else {
        return new TeamView();
      }
    })();
    let _record = model;
    return new Model2(
      _record.count,
      new_mode,
      _record.users,
      _record.useronedrafted,
      _record.usertwodrafted,
      _record.userthreedrafted,
      _record.userfourdrafted,
      _record.players,
      _record.playernumber,
      _record.draftpick,
      _record.direction
    );
  } else {
    let player = msg[0];
    console_log("picked by " + to_string(model.playernumber));
    console_log("type " + player.position);
    let $ = model.playernumber;
    if ($ === 1) {
      let drafted_list = get_drafted_list(model, model.playernumber);
      let count = count_players(drafted_list, player.position);
      console_log(player.position + " count: " + to_string(count));
      let is_valid_draft = (() => {
        let $1 = player.position;
        if ($1 === "QB" && count === 0) {
          return true;
        } else if ($1 === "QB" && count === 1) {
          return true;
        } else if ($1 === "TE" && count === 0) {
          return true;
        } else if ($1 === "TE" && count === 1) {
          return true;
        } else if ($1 === "WR" && count === 0) {
          return true;
        } else if ($1 === "WR" && count === 1) {
          return true;
        } else if ($1 === "WR" && count === 2) {
          return true;
        } else if ($1 === "RB" && count === 0) {
          return true;
        } else if ($1 === "RB" && count === 1) {
          return true;
        } else if ($1 === "RB" && count === 2) {
          return true;
        } else {
          return false;
        }
      })();
      if (is_valid_draft) {
        let $1 = model.draftpick;
        if ($1 === 40) {
          return model;
        } else {
          let new_playernumber = (() => {
            let $2 = model.direction;
            let $3 = model.playernumber;
            if ($2 instanceof Forward && $3 === 1) {
              return 2;
            } else if ($2 instanceof Forward && $3 === 2) {
              return 3;
            } else if ($2 instanceof Forward && $3 === 3) {
              return 4;
            } else if ($2 instanceof Forward && $3 === 4) {
              return 4;
            } else if ($2 instanceof Backward && $3 === 4) {
              return 3;
            } else if ($2 instanceof Backward && $3 === 3) {
              return 2;
            } else if ($2 instanceof Backward && $3 === 2) {
              return 1;
            } else if ($2 instanceof Backward && $3 === 1) {
              return 1;
            } else {
              let n = $3;
              return n;
            }
          })();
          let new_direction = (() => {
            let $2 = model.direction;
            let $3 = model.playernumber;
            if ($2 instanceof Forward && $3 === 4 && new_playernumber === 4) {
              return new Backward();
            } else if ($2 instanceof Backward && $3 === 1 && new_playernumber === 1) {
              return new Forward();
            } else {
              let dir = $2;
              return dir;
            }
          })();
          let new_draftpick = model.draftpick + 1;
          let player_with_updated_adp = (() => {
            let _record2 = player;
            return new Player(
              _record2.firstname,
              _record2.lastname,
              _record2.position,
              _record2.team,
              new_draftpick
            );
          })();
          let updated_players = filter(
            model.players,
            (p2) => {
              return !isEqual(p2, player);
            }
          );
          let new_model = (() => {
            let $2 = model.playernumber;
            if ($2 === 1) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                append(
                  model.useronedrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.usertwodrafted,
                _record2.userthreedrafted,
                _record2.userfourdrafted,
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else if ($2 === 2) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                _record2.useronedrafted,
                append(
                  model.usertwodrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.userthreedrafted,
                _record2.userfourdrafted,
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else if ($2 === 3) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                _record2.useronedrafted,
                _record2.usertwodrafted,
                append(
                  model.userthreedrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.userfourdrafted,
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else if ($2 === 4) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                _record2.useronedrafted,
                _record2.usertwodrafted,
                _record2.userthreedrafted,
                append(
                  model.userfourdrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else {
              return model;
            }
          })();
          let _record = new_model;
          return new Model2(
            _record.count,
            _record.view_mode,
            _record.users,
            _record.useronedrafted,
            _record.usertwodrafted,
            _record.userthreedrafted,
            _record.userfourdrafted,
            updated_players,
            new_playernumber,
            new_draftpick,
            new_direction
          );
        }
      } else {
        console_log("Cannot draft more players of this position");
        return model;
      }
    } else if ($ === 2) {
      let drafted_list = get_drafted_list(model, model.playernumber);
      let count = count_players(drafted_list, player.position);
      console_log(player.position + " count: " + to_string(count));
      let is_valid_draft = (() => {
        let $1 = player.position;
        if ($1 === "QB" && count === 0) {
          return true;
        } else if ($1 === "QB" && count === 1) {
          return true;
        } else if ($1 === "TE" && count === 0) {
          return true;
        } else if ($1 === "TE" && count === 1) {
          return true;
        } else if ($1 === "WR" && count === 0) {
          return true;
        } else if ($1 === "WR" && count === 1) {
          return true;
        } else if ($1 === "WR" && count === 2) {
          return true;
        } else if ($1 === "RB" && count === 0) {
          return true;
        } else if ($1 === "RB" && count === 1) {
          return true;
        } else if ($1 === "RB" && count === 2) {
          return true;
        } else {
          return false;
        }
      })();
      if (is_valid_draft) {
        let $1 = model.draftpick;
        if ($1 === 40) {
          return model;
        } else {
          let new_playernumber = (() => {
            let $2 = model.direction;
            let $3 = model.playernumber;
            if ($2 instanceof Forward && $3 === 1) {
              return 2;
            } else if ($2 instanceof Forward && $3 === 2) {
              return 3;
            } else if ($2 instanceof Forward && $3 === 3) {
              return 4;
            } else if ($2 instanceof Forward && $3 === 4) {
              return 4;
            } else if ($2 instanceof Backward && $3 === 4) {
              return 3;
            } else if ($2 instanceof Backward && $3 === 3) {
              return 2;
            } else if ($2 instanceof Backward && $3 === 2) {
              return 1;
            } else if ($2 instanceof Backward && $3 === 1) {
              return 1;
            } else {
              let n = $3;
              return n;
            }
          })();
          let new_direction = (() => {
            let $2 = model.direction;
            let $3 = model.playernumber;
            if ($2 instanceof Forward && $3 === 4 && new_playernumber === 4) {
              return new Backward();
            } else if ($2 instanceof Backward && $3 === 1 && new_playernumber === 1) {
              return new Forward();
            } else {
              let dir = $2;
              return dir;
            }
          })();
          let new_draftpick = model.draftpick + 1;
          let player_with_updated_adp = (() => {
            let _record2 = player;
            return new Player(
              _record2.firstname,
              _record2.lastname,
              _record2.position,
              _record2.team,
              new_draftpick
            );
          })();
          let updated_players = filter(
            model.players,
            (p2) => {
              return !isEqual(p2, player);
            }
          );
          let new_model = (() => {
            let $2 = model.playernumber;
            if ($2 === 1) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                append(
                  model.useronedrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.usertwodrafted,
                _record2.userthreedrafted,
                _record2.userfourdrafted,
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else if ($2 === 2) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                _record2.useronedrafted,
                append(
                  model.usertwodrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.userthreedrafted,
                _record2.userfourdrafted,
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else if ($2 === 3) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                _record2.useronedrafted,
                _record2.usertwodrafted,
                append(
                  model.userthreedrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.userfourdrafted,
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else if ($2 === 4) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                _record2.useronedrafted,
                _record2.usertwodrafted,
                _record2.userthreedrafted,
                append(
                  model.userfourdrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else {
              return model;
            }
          })();
          let _record = new_model;
          return new Model2(
            _record.count,
            _record.view_mode,
            _record.users,
            _record.useronedrafted,
            _record.usertwodrafted,
            _record.userthreedrafted,
            _record.userfourdrafted,
            updated_players,
            new_playernumber,
            new_draftpick,
            new_direction
          );
        }
      } else {
        console_log("Cannot draft more players of this position");
        return model;
      }
    } else if ($ === 3) {
      let drafted_list = get_drafted_list(model, model.playernumber);
      let count = count_players(drafted_list, player.position);
      console_log(player.position + " count: " + to_string(count));
      let is_valid_draft = (() => {
        let $1 = player.position;
        if ($1 === "QB" && count === 0) {
          return true;
        } else if ($1 === "QB" && count === 1) {
          return true;
        } else if ($1 === "TE" && count === 0) {
          return true;
        } else if ($1 === "TE" && count === 1) {
          return true;
        } else if ($1 === "WR" && count === 0) {
          return true;
        } else if ($1 === "WR" && count === 1) {
          return true;
        } else if ($1 === "WR" && count === 2) {
          return true;
        } else if ($1 === "RB" && count === 0) {
          return true;
        } else if ($1 === "RB" && count === 1) {
          return true;
        } else if ($1 === "RB" && count === 2) {
          return true;
        } else {
          return false;
        }
      })();
      if (is_valid_draft) {
        let $1 = model.draftpick;
        if ($1 === 40) {
          return model;
        } else {
          let new_playernumber = (() => {
            let $2 = model.direction;
            let $3 = model.playernumber;
            if ($2 instanceof Forward && $3 === 1) {
              return 2;
            } else if ($2 instanceof Forward && $3 === 2) {
              return 3;
            } else if ($2 instanceof Forward && $3 === 3) {
              return 4;
            } else if ($2 instanceof Forward && $3 === 4) {
              return 4;
            } else if ($2 instanceof Backward && $3 === 4) {
              return 3;
            } else if ($2 instanceof Backward && $3 === 3) {
              return 2;
            } else if ($2 instanceof Backward && $3 === 2) {
              return 1;
            } else if ($2 instanceof Backward && $3 === 1) {
              return 1;
            } else {
              let n = $3;
              return n;
            }
          })();
          let new_direction = (() => {
            let $2 = model.direction;
            let $3 = model.playernumber;
            if ($2 instanceof Forward && $3 === 4 && new_playernumber === 4) {
              return new Backward();
            } else if ($2 instanceof Backward && $3 === 1 && new_playernumber === 1) {
              return new Forward();
            } else {
              let dir = $2;
              return dir;
            }
          })();
          let new_draftpick = model.draftpick + 1;
          let player_with_updated_adp = (() => {
            let _record2 = player;
            return new Player(
              _record2.firstname,
              _record2.lastname,
              _record2.position,
              _record2.team,
              new_draftpick
            );
          })();
          let updated_players = filter(
            model.players,
            (p2) => {
              return !isEqual(p2, player);
            }
          );
          let new_model = (() => {
            let $2 = model.playernumber;
            if ($2 === 1) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                append(
                  model.useronedrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.usertwodrafted,
                _record2.userthreedrafted,
                _record2.userfourdrafted,
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else if ($2 === 2) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                _record2.useronedrafted,
                append(
                  model.usertwodrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.userthreedrafted,
                _record2.userfourdrafted,
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else if ($2 === 3) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                _record2.useronedrafted,
                _record2.usertwodrafted,
                append(
                  model.userthreedrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.userfourdrafted,
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else if ($2 === 4) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                _record2.useronedrafted,
                _record2.usertwodrafted,
                _record2.userthreedrafted,
                append(
                  model.userfourdrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else {
              return model;
            }
          })();
          let _record = new_model;
          return new Model2(
            _record.count,
            _record.view_mode,
            _record.users,
            _record.useronedrafted,
            _record.usertwodrafted,
            _record.userthreedrafted,
            _record.userfourdrafted,
            updated_players,
            new_playernumber,
            new_draftpick,
            new_direction
          );
        }
      } else {
        console_log("Cannot draft more players of this position");
        return model;
      }
    } else if ($ === 4) {
      let drafted_list = get_drafted_list(model, model.playernumber);
      let count = count_players(drafted_list, player.position);
      console_log(player.position + " count: " + to_string(count));
      let is_valid_draft = (() => {
        let $1 = player.position;
        if ($1 === "QB" && count === 0) {
          return true;
        } else if ($1 === "QB" && count === 1) {
          return true;
        } else if ($1 === "TE" && count === 0) {
          return true;
        } else if ($1 === "TE" && count === 1) {
          return true;
        } else if ($1 === "WR" && count === 0) {
          return true;
        } else if ($1 === "WR" && count === 1) {
          return true;
        } else if ($1 === "WR" && count === 2) {
          return true;
        } else if ($1 === "RB" && count === 0) {
          return true;
        } else if ($1 === "RB" && count === 1) {
          return true;
        } else if ($1 === "RB" && count === 2) {
          return true;
        } else {
          return false;
        }
      })();
      if (is_valid_draft) {
        let $1 = model.draftpick;
        if ($1 === 40) {
          return model;
        } else {
          let new_playernumber = (() => {
            let $2 = model.direction;
            let $3 = model.playernumber;
            if ($2 instanceof Forward && $3 === 1) {
              return 2;
            } else if ($2 instanceof Forward && $3 === 2) {
              return 3;
            } else if ($2 instanceof Forward && $3 === 3) {
              return 4;
            } else if ($2 instanceof Forward && $3 === 4) {
              return 4;
            } else if ($2 instanceof Backward && $3 === 4) {
              return 3;
            } else if ($2 instanceof Backward && $3 === 3) {
              return 2;
            } else if ($2 instanceof Backward && $3 === 2) {
              return 1;
            } else if ($2 instanceof Backward && $3 === 1) {
              return 1;
            } else {
              let n = $3;
              return n;
            }
          })();
          let new_direction = (() => {
            let $2 = model.direction;
            let $3 = model.playernumber;
            if ($2 instanceof Forward && $3 === 4 && new_playernumber === 4) {
              return new Backward();
            } else if ($2 instanceof Backward && $3 === 1 && new_playernumber === 1) {
              return new Forward();
            } else {
              let dir = $2;
              return dir;
            }
          })();
          let new_draftpick = model.draftpick + 1;
          let player_with_updated_adp = (() => {
            let _record2 = player;
            return new Player(
              _record2.firstname,
              _record2.lastname,
              _record2.position,
              _record2.team,
              new_draftpick
            );
          })();
          let updated_players = filter(
            model.players,
            (p2) => {
              return !isEqual(p2, player);
            }
          );
          let new_model = (() => {
            let $2 = model.playernumber;
            if ($2 === 1) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                append(
                  model.useronedrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.usertwodrafted,
                _record2.userthreedrafted,
                _record2.userfourdrafted,
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else if ($2 === 2) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                _record2.useronedrafted,
                append(
                  model.usertwodrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.userthreedrafted,
                _record2.userfourdrafted,
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else if ($2 === 3) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                _record2.useronedrafted,
                _record2.usertwodrafted,
                append(
                  model.userthreedrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.userfourdrafted,
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else if ($2 === 4) {
              let _record2 = model;
              return new Model2(
                _record2.count,
                _record2.view_mode,
                _record2.users,
                _record2.useronedrafted,
                _record2.usertwodrafted,
                _record2.userthreedrafted,
                append(
                  model.userfourdrafted,
                  toList([player_with_updated_adp])
                ),
                _record2.players,
                _record2.playernumber,
                _record2.draftpick,
                _record2.direction
              );
            } else {
              return model;
            }
          })();
          let _record = new_model;
          return new Model2(
            _record.count,
            _record.view_mode,
            _record.users,
            _record.useronedrafted,
            _record.usertwodrafted,
            _record.userthreedrafted,
            _record.userfourdrafted,
            updated_players,
            new_playernumber,
            new_draftpick,
            new_direction
          );
        }
      } else {
        console_log("Cannot draft more players of this position");
        return model;
      }
    } else {
      console_log("Invalid player number");
      return model;
    }
  }
}
function round_label(round3) {
  return p(
    toList([class$("mb-2")]),
    toList([text2("Round " + to_string(round3))])
  );
}
function drafted_users_view(players) {
  return div(
    toList([]),
    toList([
      div(
        toList([class$("flex flex-row")]),
        map(
          players,
          (player) => {
            return div(
              toList([class$(player.position)]),
              toList([
                div(
                  toList([class$("playerHeader")]),
                  toList([
                    div(
                      toList([]),
                      toList([
                        span(
                          toList([class$("ml-2")]),
                          toList([text2(player.position)])
                        ),
                        span(toList([]), toList([text2(" - ")])),
                        span(
                          toList([]),
                          toList([text2(player.team)])
                        )
                      ])
                    ),
                    div(
                      toList([]),
                      toList([
                        span(
                          toList([class$("ml-2")]),
                          toList([text2(to_string(player.adp))])
                        )
                      ])
                    )
                  ])
                ),
                p(
                  toList([class$("ml-2 firstName")]),
                  toList([text2(player.firstname)])
                ),
                p(
                  toList([class$("ml-2 lastName")]),
                  toList([text2(player.lastname)])
                )
              ])
            );
          }
        )
      )
    ])
  );
}
function draft_view(users, players, useronedrafted, usertwodrafted, userthreedrafted, userfourdrafted) {
  return div(
    toList([class$("p-4 text-white")]),
    toList([
      h2(
        toList([class$("text-xl mb-4")]),
        toList([text("Draft Board")])
      ),
      div(
        toList([class$("draftBoard")]),
        toList([
          div(
            toList([class$("draft")]),
            toList([
              p(
                toList([class$("mb-2 ml-20")]),
                toList([text2("Round 1")])
              ),
              div(
                toList([class$("draft")]),
                map(
                  range(2, 10),
                  (round3) => {
                    return round_label(round3);
                  }
                )
              )
            ])
          ),
          div(
            toList([class$("flex flex-row")]),
            toList([
              div(
                toList([class$("users")]),
                map(
                  users,
                  (user) => {
                    return p(
                      toList([class$("")]),
                      toList([text2(user)])
                    );
                  }
                )
              ),
              div(
                toList([class$("test")]),
                toList([
                  drafted_users_view(useronedrafted),
                  drafted_users_view(usertwodrafted),
                  drafted_users_view(userthreedrafted),
                  drafted_users_view(userfourdrafted)
                ])
              )
            ])
          )
        ])
      ),
      div(
        toList([class$("availablePlayers")]),
        toList([
          div(
            toList([]),
            map(
              players,
              (player) => {
                return div(
                  toList([class$("draftablePlayer")]),
                  toList([
                    div(
                      toList([]),
                      toList([
                        p(
                          toList([
                            class$("draftPlayer"),
                            on_click(new IncrementPlayerNumber(player))
                          ]),
                          toList([text2("+")])
                        )
                      ])
                    ),
                    div(
                      toList([]),
                      toList([
                        p(
                          toList([class$("ml-2 firstName")]),
                          toList([
                            text2(
                              player.firstname + " " + player.lastname
                            )
                          ])
                        ),
                        div(
                          toList([class$("posName")]),
                          toList([
                            span(
                              toList([class$("ml-2")]),
                              toList([text2(player.position)])
                            ),
                            span(toList([]), toList([text2(" - ")])),
                            span(
                              toList([]),
                              toList([text2(player.team)])
                            )
                          ])
                        )
                      ])
                    )
                  ])
                );
              }
            )
          )
        ])
      )
    ])
  );
}
function team_view() {
  return div(
    toList([class$("text-white p-4")]),
    toList([p(toList([]), toList([text("show teams")]))])
  );
}
function view(model) {
  return div(
    toList([class$("min-h-screen w-full bg-header-dark")]),
    toList([
      header(
        toList([
          class$(
            "p-4 bg-custom-dark text-white flex justify-around items-center"
          )
        ]),
        toList([
          div(
            toList([]),
            toList([
              h1(
                toList([class$("text-4xl font-bold")]),
                toList([text2("Playoff Push")])
              ),
              h3(
                toList([class$("font-bold pl-2")]),
                toList([
                  text2("Experience Fantasy Football for the NFL Playoffs")
                ])
              )
            ])
          ),
          button(
            toList([
              on_click(new ToggleView()),
              class$("btn-primary")
            ]),
            toList([text("Switch View")])
          )
        ])
      ),
      (() => {
        let $ = model.view_mode;
        if ($ instanceof TeamView) {
          return div(
            toList([
              class$("flex justify-center items-center h-full")
            ]),
            toList([team_view()])
          );
        } else {
          return div(
            toList([
              class$("flex justify-center items-center h-full")
            ]),
            toList([
              draft_view(
                model.users,
                model.players,
                model.useronedrafted,
                model.usertwodrafted,
                model.userthreedrafted,
                model.userfourdrafted
              )
            ])
          );
        }
      })()
    ])
  );
}
function main() {
  let app = simple(init2, update, view);
  let $ = start2(app, "#app", void 0);
  if (!$.isOk()) {
    throw makeError(
      "let_assert",
      "client",
      12,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $ }
    );
  }
  return void 0;
}

// build/.lustre/entry.mjs
main();
