exports.done = function(ok, doc,v,params,trkey,tr){

    var parsed = false;
    // parse response body as JSON if possible
    try { parsed = JSON.parse(params.out); }catch(ex){}

    // false response body are always stored
    // positive reponse body are stored only if allowed by storepositive
    if (params.out && (!ok || tr.storepositive)) 
        tr.out = params.out;

    var escapeRegExp = function(string) {
        return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    };

    // replace all vars <$X$> in tr.success/error with out.X
    //if (tr.storepositive && typeof tr.out=='object'){
    var handlers = [];
    if (tr.success) handlers.push('success');
    if (tr.error) handlers.push('error');
    for (var j in handlers){
        var obj = tr[handlers[j]], nextsuccess=obj.success,nexterror=obj.error;
        if (obj.success) delete obj.success;
        if (obj.error) delete obj.error;
        var newtr = JSON.stringify(obj);
        newtr = newtr.replace(/<%out%>/gi,new RegExp(/^.(.*).$/i).exec(JSON.stringify((params.out||"").toString()))[1]||"");
        if (typeof parsed=="object") {
            for (var i in parsed||{}){
                switch(typeof parsed[i]){
                    case "undefined":
                    case "object":
                        break;
                    default:
                        try{
                        newtr = newtr.replace(new RegExp(escapeRegExp("<%"+(i||"").toString()+"%>"),'gi'),new RegExp(/^.(.*).$/i).exec(JSON.stringify(parsed[i].toString()))[1]||"");
                        } catch(e){
                            //tr.logs.push[(e||"UNK").toString()];
                        }
                        break;
                }
            }
        }
        newtr = newtr.replace(/<%[^%]+%>/gi,"");
        var newobj = JSON.parse(newtr);
        var obj = tr[handlers[j]];
        if (nextsuccess) newobj.success=nextsuccess;
        if (nexterror) newobj.error=nexterror;
        tr[handlers[j]]=newobj;
    }

    // preparing chained success/error triggers if any
    if (!ok && typeof tr.error=='object') {
        /*if (params.out) {
            tr.error.params = tr.error.params?tr.error.params:{};
            tr.error.params.reason = params.out;
        }*/
        doc.triggers=doc.triggers?doc.triggers:{};
        doc.triggers[trkey] = tr.error;

    } else if (ok && typeof tr.success=='object') {
        doc.triggers=doc.triggers?doc.triggers:{};
        doc.triggers[trkey] = tr.success;
    } else {
        // otherwise cleaning from triggers array
        delete doc.triggers[trkey];
        if (Object.keys(doc.triggers).length<=0) delete doc.triggers;
    }
    
    // clean before moving to triggered object
    if (tr.success) delete tr.success;
    if (tr.error) delete tr.error;
    if (tr.storepositive) delete tr.storepositive;

    // moving to triggered object
    doc.triggered = doc.triggered?doc.triggered:{};
    doc.triggered[trkey] = tr;

    return doc;
};