var GooRule = function(srcURL, dstObj) {
    var WILDCARD = "wildcard",
        REGEXP   = "regexp";

    var replaceWildcard = function(url) {
            //js不支持look-behind，所以这里采用将字符串倒转，之后采用look-ahead方式
            //这里需要将*与?替换为.*与.?，而\*与\?保留不变
            var reverse = function(str) {
                return str.split("").reverse().join("");
            };
            var reversedUrl = reverse(url);
            return reverse(reversedUrl.replace(/([\*|\?])(?!\\)/g,"$1."));
    };
    this.includePatterns = [];
    this.excludePatterns = [];
    this.kind   = dstObj.kind || WILDCARD; //规则默认为WILDCARD类型
    this.dstURL = dstObj.dstURL;
    this.enable = dstObj.hasOwnProperty("enable")? dstObj.enable : true;   //规则默认开启
    this.isWildcard = function() {
        return this.kind === WILDCARD;
    }
    this.srcURL = this.isWildcard() ? replaceWildcard(srcURL) : srcURL;

    if(dstObj.includePatterns){
    for(var i=0;i<dstObj.includePatterns.length;i++)
        {
            patternurl = dstObj.includePatterns[i];
            this.includePatterns.push(this.isWildcard() ? replaceWildcard(patternurl) : patternurl);
        }
    }

    if(dstObj.excludePatterns){
        for(var i=0;i<dstObj.excludePatterns.length;i++)
        {
            patternurl = dstObj.excludePatterns[i];
            this.excludePatterns.push(this.isWildcard() ? replaceWildcard(patternurl) : patternurl);
        }
    }


    this.toJson = function() {
        var json = {};
        json[this.getKey()] = this.getValue();
        return json;
    }
    this.getKey = function() {
        return this.srcURL;
    }
    this.getValue = function() {
        return {
            dstURL : this.dstURL,
            kind: this.kind,
            includePatterns : this.includePatterns,
            excludePatterns : this.excludePatterns,
            enable : this.enable
        };
    }
    this.getKindLabel = function() {
        if (this.isWildcard()) {
            return "通配符";
        } else {
            return "正则式";
        }
    }
    this.getSrcURLLabel = function() {
        if (this.isWildcard() && this.srcURL.match(/\.(\*|\?)/g)) {
            return this.srcURL.replace(/\.(\*|\?)/g, "$1");
        } else {
            return this.srcURL;
        }
    }
    this.isMatch = function(url){
        var i=0,isMatch = false;
        if(this.includePatterns.length == 0){
            isMatch = true;
        }
        else
        {
            for(i=0;i<this.includePatterns.length;i++)
            {
                var redirectRE = new RegExp(this.includePatterns[i],"i");
                if(redirectRE.exec(url))
                {
                    isMatch = true;
                    break;
                }
            }
        }

        for(i=0;i<this.excludePatterns.length;i++)
        {
            var redirectRE = new RegExp(this.excludePatterns[i],"i");
            if(redirectRE.exec(url))
            {
                isMatch = false;
                break;
            }
        }
        return isMatch;
    }
}
var GooOnlineURL = function(url, interval, enable) {
    this.url = url;
    this.interval = interval;
    this.enable = enable;
    this.toJson = function() {
        return {
            url: this.url,
            interval: this.interval,
            enable: this.enable
        };
    }
}

var gooDB = new (function () {
    var RULES_KEY      = "rules",
        ISREDIRECT_KEY = "isRedirect";
    var ONLINE_URL_KEY = "onlineRulesURL",
        online_url = {
            url: "https://raw.githubusercontent.com/koozzz/gooreplacer4chrome/master/gooreplacer.gson",
            interval: 0,
            enable: true
        };
    var LAST_UPDATE_KEY = "onlineLastUpdateTime";
    var ONLINE_RULES_KEY = "onlineRules";
    this.rules = [];
    this.init = function() {
        if(!localStorage.getItem(ISREDIRECT_KEY)) {
            localStorage.setItem(ISREDIRECT_KEY, true);
        }
        if(!localStorage.getItem(ONLINE_URL_KEY)) {
            localStorage.setItem(ONLINE_URL_KEY, JSON.stringify(online_url));
        }
    }
    this.getOnlineURL = function() {
        return JSON.parse(localStorage.getItem(ONLINE_URL_KEY));
    }
    this.setOnlineURL = function(onlineURL) {
        localStorage.setItem(ONLINE_URL_KEY, JSON.stringify(onlineURL.toJson()));
    }
    this.getLastUpdateTime = function() {
        return parseInt(localStorage.getItem(LAST_UPDATE_KEY)) || 0;
    }
    this.setLastUpdateTime = function(updateTime) {
        localStorage.setItem(LAST_UPDATE_KEY, updateTime);
    }
    this.updateRules = function() {
        // var db = db || RULES_KEY;
        var arr = [];
        var jsonRules = JSON.parse(localStorage.getItem(ONLINE_RULES_KEY));
        for(var k in jsonRules) {
            arr.push(new GooRule(k, jsonRules[k]));
        }
        this.rules = arr;
    }
    this.getRules = function(url) {
        var i=0,arr = [];
        for(i=0;i<this.rules.length;i++) {
            if(this.rules[i].isMatch(url))
            {
                arr.push(this.rules[i]);
            }
        }
        return arr;
    }
    this.setRules = function(rules, db) {
        var db = db || RULES_KEY;
        for (var i = 0; i < rules.length; i++) {
            this.addRule(rules[i], db);
        };
    }
    this.addRule = function(rule, db) {
        var db = db || RULES_KEY;
        var jsonRules = JSON.parse(localStorage.getItem(db)) || {};
        jsonRules[rule.getSrcURLLabel()] = rule.getValue();
        localStorage.setItem(db, JSON.stringify(jsonRules));
    }
    this.deleteRule = function(ruleKey, db) {
        var db = db || RULES_KEY;
        var jsonRules = JSON.parse(localStorage.getItem(db));
        if (ruleKey) {
            delete jsonRules[ruleKey];
            localStorage.setItem(db, JSON.stringify(jsonRules));
        } else {
            //如果 ruleKey == null， 清空之前的所有规则
            localStorage.removeItem(db);
        }
        this.rules = [];
    }
    this.updateRule = function(srcURL, rule, db) {
        var db = db || RULES_KEY;
        var jsonRules = JSON.parse(localStorage.getItem(db));
        delete jsonRules[srcURL];
        jsonRules[rule.getSrcURLLabel()] = rule.getValue();
        localStorage.setItem(db, JSON.stringify(jsonRules));
    }
    this.toggleRule = function(ruleKey, db) {
        var db = db || RULES_KEY;
        var jsonRules = JSON.parse(localStorage.getItem(db));
        jsonRules[ruleKey]["enable"] = ! jsonRules[ruleKey]["enable"];
        localStorage.setItem(db, JSON.stringify(jsonRules));
        return jsonRules[ruleKey]["enable"];
    }
    this.getIsRedirect = function() {
        return JSON.parse(localStorage.getItem(ISREDIRECT_KEY));
    }
    this.setIsRedirect = function(isRedirect) {
        return localStorage.setItem(ISREDIRECT_KEY, isRedirect);
    }
    this.resetOnline = function() {
        gooDB.setOnlineURL(new GooOnlineURL(online_url.url, online_url.interval, online_url.enable));
        alert("在线规则已经重置！");
    }
});
