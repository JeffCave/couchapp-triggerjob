function(doc, req) {
    try {
        var v = require("lib/utils").utils(req),msg='',isNew=false, params = v.getParams();
        v.assert(req.method == "PUT", "Only PUT method allowed", 400);

        v.shouldBeLogged();
        v.assert(v.isAdmin(),"You must be admin",401);
        v.assert(doc, "Doc not found", 404);
        v.assert(params.action, "Param \"action\" not specified",400);
        var trkey = params.trkey||params.triggerid||false;
        v.assert(trkey, "Params \"trkey\" not specified",400);

        var tr = doc.triggers && typeof doc.triggers[trkey]!="undefined" ? doc.triggers[trkey] : false;
        v.assert(tr,"Trigger key \""+trkey+"\" not found in doc.triggers", 400);

        switch(params.action){
            case "delay":
                v.assert(tr.delay && typeof tr.delay=="number","NO delay set on trigger \""+trkey+"\"", 400);

                doc.triggers[trkey].start = (tr.start||v.now())+tr.delay*1000; // delay is in seconds
                delete doc.triggers[trkey].delay;

                msg = "DELAYED trigger \""+trkey+"\"";
                break;

            case "queued":
                v.assert(!tr.queued||tr.queued<tr.start,"ALREADY queued trigger \""+trkey+"\"", 400);
                doc.triggers[trkey] = {queued:v.now()};

                // We keep params needed(read) by done action
                if (tr.error) doc.triggers[trkey].error = tr.error;
                if (tr.success) doc.triggers[trkey].success = tr.success;
                if (tr.storepositive) doc.triggers[trkey].storepositive = tr.storepositive;
                if (tr.type) doc.triggers[trkey].type = tr.type;
                if (tr.start) doc.triggers[trkey].start = tr.start;

                msg = "QUEUED trigger \""+trkey+"\"";
                break;
                
            case "done":
                // Moving trigger from triggers to triggered
                tr.done = v.now();
                tr.code = params.code||params.ok;
                var ok = typeof tr.code=="boolean"?tr.code:(typeof tr.code == "number" && tr.code>=200 && tr.code<300);

                var triggerfn = require("lib/triggers/"+(tr.type||"http"));
                if (typeof triggerfn =="object" && typeof triggerfn.done=="function") {
                    doc = triggerfn.done(ok,doc,v,params,trkey,tr);
                } else {
                    // otherwise cleaning from triggers array
                    delete doc.triggers[trkey];
                    if (Object.keys(doc.triggers).length<=0) delete doc.triggers;
                }

                msg = "DONE trigger \""+trkey+"\"";
                break;

            default:
                v.assert(false, "Invalid trigger action", 400);
                break;
        }
        return [doc,v.response({ok:true, msg:msg}),isNew?201:200];

    } catch(ex) {
        var err = ex.toString();
        try {err = JSON.stringify(ex);}catch(e){};
        return [null,"TRIGGERJOB-COUCHAPP: "+err];
    }
};
