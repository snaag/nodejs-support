import {Sentence, Word, Morpheme, Relationship, POS} from './koalanlp/data';

/**
 * @private
 * @type {{import:*, newInstanceSync:*, callStaticMethodSync:*}}
 */
let java = {};

/**
 * Assert method
 * @param cond Condition to be checked.
 * @param msg Message to be thrown if condition check is failed.
 */
let assert = function(cond, msg){
    if(!cond)
        throw new Error(msg ? msg : "Assertion failed!");
};

/**
 * Utility methods
 * @type {{POS: POS, TYPES}}
 * @property {POS} POS 품사분석을 위한 도구.
 * @property {Object} TYPES 분석기 API 목록.
 */
export let util = {
    POS: POS,
    TYPES: require('./koalanlp/const').TYPES
};

/**
 * 분석결과 Callback
 * @callback parseCallback
 * @param {{error: *, result: Sentence[]}} result
 * @return *
 */

/**
 * 품사분석기 Wrapper 클래스
 */
export class Tagger{
    /**
     * 품사분석기를 생성합니다.
     * @param {string} taggerType API 유형
     */
    constructor(taggerType){
        let Base = java.import(`kr.bydelta.koala.${taggerType}.Tagger`);
        this.tagger = new Base();
    }

    /**
     * 문단단위 품사표기
     * @param {string} paragraph 품사표기할 문단.
     * @param {parseCallback=} callback 콜백함수 (Object[] => void). 지정된 경우, 결과를 전달받음.
     * @return {Sentence[]|undefined} callback이 없는 경우, 품사표기 결과가 반환됨.
     */
    tag(paragraph, callback){
        if (callback) {
            this.tagger.tag(paragraph, function (err, result) {
                if (err) callback({error: err, result: []});
                else callback({error: false, result: converter(result)});
            });
        } else {
            return converter(this.tagger.tagSync(paragraph))
        }
    }

    /**
     * 문장단위 품사표기
     * @param {string} sentence 품사표기할 문장.
     * @param {parseCallback=} callback 콜백함수 (Object => void). 지정된 경우, 결과를 전달받음.
     * @return {Sentence[]|undefined} callback이 없는 경우, 품사표기 결과가 반환됨.
     */
    tagSentence(sentence, callback){
        if(callback){
            this.tagger.tagSentence(sentence, function(err, result){
                if(err) callback({error: err, result: []});
                else callback({error: false, result: [convertSentence(result)]});
            });
        }else{
            return convertSentence(this.tagger.tagSentenceSync(sentence))
        }
    }
}

/**
 * 의존구문분석기 Wrapper 클래스
 */
export class Parser{
    /**
     * 의존구문분석기를 생성합니다.
     * @param {string} parserType 의존구문분석기 API 패키지.
     * @param {string|undefined} [taggerType=undefined] 품사분석기 API 패키지. 미지정시, 의존구문분석기 패키지 이용.
     */
    constructor(parserType, taggerType){
        assert(parserType == util.TYPES.KKMA || parserType == util.TYPES.HANNANUM,
            "꼬꼬마/한나눔을 제외한 분석기는 의존구문분석을 지원하지 않습니다.");

        if(taggerType) {
            let TagBase = java.import(`kr.bydelta.koala.${taggerType}.Tagger`);
            this.tagger = new TagBase();
        }

        let ParseBase = java.import(`kr.bydelta.koala.${parserType}.Parser`);
        this.parser = new ParseBase();
    }

    /**
     * 문단단위 분석
     * @param {string|Sentence[]} paragraph 분석할 문단.
     * @param {parseCallback=} callback 콜백함수 (Object[] => void). 지정된 경우, 결과를 전달받음.
     * @return {Sentence[]|undefined} callback이 없는 경우, 분석 결과가 반환됨.
     */
    parse(paragraph, callback){
        let isSentences = Array.isArray(paragraph) && paragraph[0] instanceof Sentence;

        if(this.tagger && !isSentences) {
            if (callback) {
                let parser = this.parser;
                this.tagger.tag(paragraph, function (err, result) {
                    if (err) callback({error: err, result: []});
                    else parser.parse(result, function (err2, parsed) {
                        if (err2) callback({error: err2, result: []});
                        else callback({error: false, result: converter(parsed)});
                    });
                });
            } else {
                let tagged = this.tagger.tagSync(paragraph);
                let parsed = this.parser.parseSync(tagged);
                return converter(parsed);
            }
        }else{
            let target = paragraph;
            if (isSentences){
                target = [];
                for(let i = 0; i < paragraph.length; i ++){
                    target.push(paragraph[i].reference);
                }
            }

            if (callback) {
                this.parser.parse(target, function (err, parsed) {
                    if (err) callback({error: err, result: []});
                    else callback({error: false, result: converter(parsed)});
                });
            } else {
                let parsed = this.parser.parseSync(target);
                return converter(parsed);
            }
        }
    }

    /**
     * 문장단위 분석
     * @param {string|Sentence} sentence 분석할 문장.
     * @param {parseCallback=} callback 콜백함수 (Object => void). 지정된 경우, 결과를 전달받음.
     * @return {Sentence[]|undefined} callback이 없는 경우, 분석 결과가 반환됨.
     */
    parseSentence(sentence, callback){
        let isSentence = sentence instanceof Sentence;

        if(this.tagger && !isSentence) {
            if (callback) {
                let parser = this.parser;
                this.tagger.tagSentence(sentence, function (err, result) {
                    if (err) callback({error: err, result: []});
                    else parser.parse(result, function (err2, parsed) {
                        if (err2) callback({error: err2, result: []});
                        else callback({error: false, result: [convertSentence(parsed)]});
                    });
                });
            } else {
                let tagged = this.tagger.tagSentenceSync(sentence);
                let parsed = this.parser.parseSync(tagged);
                return convertSentence(parsed);
            }
        }else{
            let target = isSentence? sentence.reference : sentence;
            if (callback) {
                this.parser.parse(target, function (err, parsed) {
                    if (err) callback({error: err, result: []});
                    else callback({error: false, result: [convertSentence(parsed)]});
                });
            } else {
                let parsed = this.parser.parseSync(target);
                return convertSentence(parsed);
            }
        }
    }
}

/**
 * 문장분리기 클래스
 */
export class SentenceSplitter{
    /**
     * 문장분리기를 생성합니다.
     * @param {string} splitterType 문장분리기 API 패키지.
     */
    constructor(splitterType){
        assert(splitterType === util.TYPES.TWITTER || splitterType === util.TYPES.HANNANUM,
            "오픈한글(트위터)/한나눔을 제외한 분석기는 문장분리를 지원하지 않습니다.");

        let SegBase = java.import(`kr.bydelta.koala.${splitterType}.SentenceSplitter`);
        this.splitter = new SegBase();
    }

    /**
     * 문단을 문장으로 분리합니다.
     * @param {string} paragraph 분석할 문단.
     * @param {parseCallback=} callback 콜백함수 (Object[] => void). 지정된 경우, 결과를 전달받음.
     * @return {Sentence[]|undefined} callback이 없는 경우, 분석 결과가 반환됨.
     */
    sentences(paragraph, callback){
        if (callback) {
            this.splitter.sentences(paragraph, function (err, parsed) {
                if (err) callback({error: err, result: []});
                else callback({error: false, result: convertSentenceStr(parsed)});
            });
        } else {
            let parsed = this.splitter.sentencesSync(paragraph);
            return convertSentenceStr(parsed);
        }
    }

    /**
     * KoalaNLP가 구현한 문장분리기를 사용하여, 문단을 문장으로 분리합니다.
     * @param {Sentence} paragraph 분석할 문단. (품사표기가 되어있어야 합니다)
     * @param {parseCallback=} callback 콜백함수 (Object[] => void). 지정된 경우, 결과를 전달받음.
     * @return {Sentence[]|undefined} callback이 없는 경우, 분석 결과가 반환됨.
     */
    static sentencesByKoala(paragraph, callback){
        assert(paragraph instanceof Sentence);
        if (callback) {
            java.callStaticMethod("kr.bydelta.koala.util.SentenceSplitter", "apply",
                paragraph.reference, function (err, parsed) {
                if (err) callback({error: err, result: []});
                else callback({error: false, result: converter(parsed)});
            });
        } else {
            let parsed = java.callStaticMethodSync("kr.bydelta.koala.util.SentenceSplitter", "apply",
                paragraph.reference);
            return converter(parsed);
        }
    }
}

/**
 * 사용자 정의 사전 클래스
 */
export class Dictionary{
    /**
     * 사용자 정의 사전을 연결합니다.
     * @param {string} dicType 사용자 정의 사전을 연결할 API 패키지.
     */
    constructor(dicType){
        assert(dicType !== util.TYPES.RHINO,
            "라이노 분석기는 사용자 정의 사전을 지원하지 않습니다.");
        this.dict = java.callStaticMethodSync(`kr.bydelta.koala.${dicType}.JavaDictionary`, 'get')
    }

    /**
     * 사용자 사전에, 표면형과 그 품사를 추가.
     *
     * @param {string|string[]} morph 표면형.
     * @param {string|string[]} tag   세종 품사.
     */
    addUserDictionary(morph, tag){
        let isMArray = Array.isArray(morph);
        let isTArray = Array.isArray(tag);

        assert(isMArray == isTArray,
            "형태소와 품사는 둘 다 같은 길이의 배열이거나 둘 다 string이어야 합니다.");

        if(isMArray){
            assert(morph.length == tag.length,
                "형태소와 품사는 둘 다 같은 길이의 배열이어야 합니다.");
            let tuples = [];
            for(let i = 0; i < morph.length; i ++){
                tuples.push(morphToTuple(morph[i], tag[i]));
            }
            this.dict.addUserDictionarySync(morph, tuples);
        }else {
            let posTag = java.callStaticMethodSync("kr.bydelta.koala.POS", "withName", tag);
            this.dict.addUserDictionarySync(morph, posTag);
        }
    }

    /**
     * 사전에 등재되어 있는지 확인합니다.
     *
     * @param {string} word   확인할 형태소
     * @param {...string} posTag 세종품사들(기본값: NNP 고유명사, NNG 일반명사)
     */
    contains(word, ...posTag){
        let tags = posTag || ["NNP", "NNG"];
        let posTags = [];
        for(let i = 0; i < tags.length; i ++){
            posTags.push(java.callStaticMethodSync("kr.bydelta.koala.POS", "withName", tags[i]));
        }
        let posSet = java.callStaticMethodSync("scala.Predef", "genericArrayOps", posTags).toSetSync();

        return this.dict.containsSync(word, posSet);
    }

    /**
     * 사전에 등재되어 있는지 확인하고, 사전에 없는단어만 반환합니다.
     *
     * @param {boolean} onlySystemDic 시스템 사전에서만 검색할지 결정합니다.
     * @param {...{morph:string, pos:string}} word 확인할 (형태소, 품사)들.
     * @return 사전에 없는 단어들.
     */
    getNotExists(onlySystemDic, ...word){
        let wordEntries = [];
        for(let i = 0; i < word.length; i ++){
            wordEntries.push(morphToTuple(word[i]));
        }
        let wordSeq = java.callStaticMethodSync("scala.Predef", "genericArrayOps", wordEntries).toSeqSync();

        let notExists = this.dict.getNotExistsSync(onlySystemDic, wordSeq);
        let returnValue = [];
        for(let i = 0; i < notExists.sizeSync(); i ++){
            let entry = notExists.applySync(i);
            returnValue.push({morph: entry._1, tag: entry._2.toStringSync()});
        }

        return returnValue;
    }
}

/**
 * 초기화 Callback
 * @callback initCallback
 * @return *
 */

/**
 * 의존패키지 초기화 및 사전적재 함수
 * @param {{version: string|undefined, packages: string[]|undefined,
 * tempJsonName: string|undefined, debug: boolean|undefined, javaOptions: string[]|undefined,
 * useIvy2: boolean}} obj 설정 Object
 * @param {initCallback} callback 콜백 함수 (void => void)
 */
export let initialize = function(obj, callback){
    if (typeof obj === "function"){
        callback = obj;
        obj = {};
    }else if(typeof obj === "undefined"){
        obj = {};
    }

    obj.version = obj.version || "1.9.0";
    obj.packages = obj.packages || [util.TYPES.EUNJEON, util.TYPES.KKMA];
    obj.tempJsonName = obj.tempJsonName || "koalanlp.json";
    obj.debug = obj.debug === true;
    obj.javaOptions = obj.javaOptions || ["-Xmx4g"];
    obj.useIvy2 = obj.useIvy2 || false;

    require('./koalanlp/javainit').initializer(obj, function(jvm){
        java = jvm;
        console.log("[KoalaNLP] Jar file loading finished.");
        if(callback)
            callback();
    });
};

let convertWord = function(result, widx){
    let len = result.lengthSync();
    let buffer = [];
    let surface = result.surfaceSync();

    for(let i = 0; i < len; i ++){
        let morphs = result.applySync(i);
        let morpheme =
            new Morpheme(
                morphs.surfaceSync(),
                morphs.tagSync().toStringSync(),
                morphs.rawTagSync(),
                i
            );
        buffer.push(morpheme);
    }

    let word = new Word(surface, buffer, widx);
    let dependents = result.depsSync().toSeqSync();
    len = dependents.sizeSync();

    for(let i = 0; i < len; i ++){
        let rel = dependents.applySync(i);
        let relationship =
            new Relationship(
                rel.headSync(),
                rel.relationSync().toStringSync(),
                rel.rawRelSync(),
                rel.targetSync()
            );
        word.dependents.push(relationship);
    }

    return word;
};

let convertSentence = function(result){
    let len = result.lengthSync();
    let words = [];

    for(let i = 0; i < len; i ++){
        let word = result.applySync(i);
        words.push(convertWord(word, i));
    }

    let sentence = new Sentence(words, result);
    let dependents = result.rootSync().depsSync().toSeqSync();
    len = dependents.sizeSync();

    for(let i = 0; i < len; i ++){
        let rel = dependents.applySync(i);
        let relationship =
            new Relationship(
                rel.headSync(),
                rel.relationSync().toStringSync(),
                rel.rawRelSync(),
                rel.targetSync()
            );
        sentence.root.dependents.push(relationship);
    }

    return sentence;
};

let converter = function(result){
    let len = result.sizeSync();
    let buffer = [];

    for(let i = 0; i < len; i ++){
        let sentence = result.applySync(i);
        buffer.push(convertSentence(sentence));
    }
    return buffer;
};

let convertSentenceStr = function(result){
    let len = result.sizeSync();
    let buffer = [];

    for(let i = 0; i < len; i ++){
        let sentence = result.applySync(i);
        buffer.push(sentence);
    }
    return buffer;
};

let morphToTuple = function(obj, tag){
    let morph = tag? obj : obj.morph;
    let pos = tag? tag : obj.tag;

    let posEntry = java.callStaticMethodSync("kr.bydelta.koala.POS", "withName", pos);
    return java.newInstanceSync("scala.Tuple2", morph, posEntry);
};