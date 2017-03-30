gooDB.init();
gooDB.updateRules();


// 缓存当前所有tab适用的规则
var tabRule = function (tabid,url, rules) {
    var self = this;
    // self.id = tabid;
    // self.url = url;
    // self.rules = rules ? rules : [];

    self.update = function (tabid,url,rules) {
        // self.tab = tab;
        self.id =tabid;
        self.url = url;
        // self.rules = gooDB.getRules().concat(gooDB.getRules("onlineRules"));
        self.rules = gooDB.getRules(self.url).concat(rules ? rules : []);
    };

    self.update(tabid,url,rules);
};

var tabRules = {};

chrome.tabs.onCreated.addListener(
    function (tab) {
        if (!(tab.id in tabRules)) {
            tabRules[tab.id] = new tabRule(tab.id,tab.url);
        }
    }
);

// chrome.tabs.onUpdated.addListener(
//     function (tabId, changeInfo, tab) {
//         if ((changeInfo.status && changeInfo.status=="loading") || changeInfo.url) {
//             if (!(tabId in tabRules)) {
//                 tabRules[tabId] = new tabRule(tab);
//             }
//             else {
//                 tabRules[tabId].update(tab);
//             }
//         }
//     }
// );

chrome.tabs.onRemoved.addListener(
    function (tabId) {
        if (tabId in tabRules) {
            delete tabRules[tabId];
        }
    }
);

function findRedirectUrl(requestURL, gooRules) {
    for (var i = 0; i < gooRules.length; i++) {
        var gooRule = gooRules[i];
        var redirectRE = new RegExp(gooRule.srcURL);
        if (gooRule.enable) {
            var redirectMatch = redirectRE.exec(requestURL,"gi");
            if (redirectMatch) {
                var redirectURL = "";
                if (gooRule.isWildcard()) { // kind 默认为wildcard
                    redirectURL = requestURL.replace(redirectRE, gooRule.dstURL);
                } else {
                    redirectURL = requestURL.replace(redirectMatch[0], gooRule.dstURL);
                    redirectMatch = redirectMatch.splice(1);
                    for (var i = 0; i < redirectMatch.length; i++) {
                        redirectURL = redirectURL.replace("$" + (i + 1), redirectMatch[i]);
                    }
                }
                return redirectURL;
            }
        }
    }
}

chrome.webRequest.onBeforeRequest.addListener(
    function (request) {
        var requestURL = request.url,
            isRedirect = gooDB.getIsRedirect();
        if (isRedirect) {
            var tabrule = tabRules[request.tabId];
            if(request.type == "main_frame")
            {
                if(request.tabId in tabRules)
                {
                    delete tabRules[request.tabId];
                }
                tabrule = new tabRule(request.tabId,request.url);
                tabRules[request.tabId] = tabrule;
            }
                // return;
            // if (tabrule && request.type == "main_frame") {
            //     if (request.tabId in tabRules) {
            //         delete tabRules[tabId];
            //     }
            //     chrome.tabs.get(request.tabId,function(tab){
            //         tabrule = ;
            //         tabRules[request.tabId] = tabrule;
            //     });                
            // }
            if (tabrule) {
                rules = tabrule.rules;
                var redirectURL = findRedirectUrl(requestURL, rules);
                if (redirectURL) {
                    console.info('url: ' + requestURL + " , redirector to: " + redirectURL)
                    return {
                        redirectUrl: redirectURL
                    }
                }
            }

        }
    },
    // filters
    {
        urls: ["<all_urls>"]
    },
    // extraInfoSpec
    ["blocking"]
);
