var Heap = require('heap');

function compare(a, b) {
  return b.value - a.value;
}

/**
 * Convert a KVP to a Heap sorted DESC
 * @param {object} data - The KVP in the format key: {value:x}
 * @param {function} publish - (Optional) call a function with every value processed
 */
function toHeap(data, publish) {
  var heap = new Heap(compare);
  Object.keys(data).forEach(function(key) {
    heap.push(data[key]);
    if (publish) {
      publish(data[key]);
    }
  });

  return heap;
}

/**
 * Convert a KVP to a Heap sorted DESC
 * @param {object} data - The KVP in the format key: {value:x}
 * @param {function} publish - (Optional) call a function with every value processed
 */
function topK(data, top, publish) {
  var heap = new Heap(compare);
  Object.keys(data).forEach(function(key) {
    heap.push(data[key]);
    if (publish) {
      publish(data[key]);
    }
  });

  var list = [];
  for (var i = 0, length = heap.size(); i < top && i < length; i++) {
    list.push(heap.pop());
  }

  return list;
}

module.exports = {
  toHeap: toHeap,
  topK: topK
};
