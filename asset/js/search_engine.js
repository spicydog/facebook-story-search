
var k1 = 1.2;
var b = 0.75;

var invertedIndex;
var documentList;
var nDocumentWithTerm;
var currentWordIndex;
var totalDocumentsLength;

initSearchEngine();

function initSearchEngine() {
    invertedIndex = [];
    documentList = [];
    nDocumentWithTerm = [];
    currentWordIndex = 0;
    totalDocumentsLength = 0;
    buildThaiDictionary();
}

function addDocumentToBarrel(data,document) {

    var normalizedData = tokenize(data);
    var documentLength = normalizedData.length;
    var result = indexDocument(normalizedData,invertedIndex);

    document.docID = documentList.length;
    document.begin = result.begin;
    document.end = result.end;
    document.length = documentLength;

    totalDocumentsLength += documentLength;

    documentList.push(document);
}

function indexDocument(data, dictionary) {

    var words = data;
    var nextIndex = currentWordIndex;
    var wordMarks = [];

    for(var i in words) {
        var word = words[i];
        if(word && word.length>0) {
            var index = 0;
            if(dictionary[word]) {
                index = dictionary[word].length;
            } else {
                dictionary[word] = [];
            }
            dictionary[word][index] = nextIndex;
            nextIndex++;
        }

        if(!wordMarks[word]) {
            if(nDocumentWithTerm[word]) {
                nDocumentWithTerm[word]++;
            } else {
                nDocumentWithTerm[word] = 1;
            }
        }
        wordMarks[word] = true;
    }

    var fromIndex = currentWordIndex;
    var toIndex = nextIndex - 1;
    currentWordIndex = nextIndex;

    return {begin:fromIndex,end:toIndex};
}

function getDocumentID(position) {
    for(var i in documentList) {
        doc = documentList[i];
        if(doc.begin<=position && position<=doc.end) {
            return i;
        }
    }
    return -1;
}

function getDocumentInfo(documentID) {
    for(var i in documentList) {
        doc = documentList[i];
        if(doc.id == documentID) {
            return doc;
        }
    }
    return false;
}

function getSortedIndices(array) {
    var indices = [];
    for(var key in array) {
        indices.push(key);
    }

    for(var i=0; i<array.length; i++) {
        for(var j=i+1; j<array.length; j++) {
            if( array[indices[i]] > array[indices[j]] ) {
                var swap = indices[i];
                indices[i] = indices[j];
                indices[j] = swap;
            }
        }
    }
    return indices;
}

function searchFullText(keywordString) {
    var keywords = keywordString.split(' ');
    var sortedDocuments = [];
    for (var i in documentList) {
        var docID = documentList[i]['id'];
        var doc = getFeedData(docID);
        var msg = doc.message;
        if (msg && msg.length > 0) {
            var match = false;
            for (var j in keywords) {
                var keyword = keywords[j];
                if (keyword.length > 0 && msg.indexOf(keyword) != -1) {
                    match = true;
                    break;
                }
            }
            if (match) {
                sortedDocuments.push(documentList[i]);
            }
        }
    }
    return sortedDocuments;
}

function searchRelevant(keyword) {
    var keywords = tokenize(keyword);
    var scores = getDocumentsScores(keywords);
    var sortedIndex = getSortedIndices(scores).reverse();

    var sortedDocuments = [];
    for(var i in sortedIndex) {
        var docID = sortedIndex[i];
        if(scores[docID] > 0) {
            documentList[docID].score = scores[docID];
            sortedDocuments.push(documentList[docID]);
        }
    }
    return sortedDocuments;
}


function getDocumentsScores(terms) {
    var scores = [];

    for(var i in terms) {
        var term = terms[i];
        calculateTermFrequencyInDocuments(term);
        for(var j in documentList) {
            var document = documentList[j];
            var score = bm25(term,document);
            if(scores[j]===undefined) {
                scores[j] = score;
            } else {
                scores[j] += score;
            }
        }
    }

    return scores;
}


function bm25(term,document) {
    return getIDF(term) * getTF(document);
}

function getIDF(term) {
    var nq = nDocumentWithTerm[term];
    var n = documentList.length;
    return  Math.log((n - nq + 0.5) / (nq + 0.5));
}

function getTF(document) {
    var fQD = getTermFrequencyInDocument(document);
    var avgDocLength = totalDocumentsLength/document.length;
    var docLength = document.length;
    return ( fQD * (k1+1) ) / (fQD + k1 * (1-b + b*docLength/avgDocLength) );
}

var termFrequencyInDocuments;
function calculateTermFrequencyInDocuments(term) {
    termFrequencyInDocuments = [];
    var termDictionary = invertedIndex[term];
    for(var i in termDictionary) {
        var docID = getDocumentID(termDictionary[i]);
        if(termFrequencyInDocuments[docID]) {
            termFrequencyInDocuments[docID]++;
        } else {
            termFrequencyInDocuments[docID] = 1;
        }
    }
}

function getTermFrequencyInDocument(document) {
    if(termFrequencyInDocuments[document.docID]) {
        return termFrequencyInDocuments[document.docID];
    } else {
        return 0;
    }
}
