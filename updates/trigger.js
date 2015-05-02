function(doc, req) {
    try {
        var v = require("lib/utils").utils(req),msg='',isNew=false, params = v.getParams();
        v.assert(req.method == "PUT", "Only PUT method allowed", 400);

        v.shouldBeLogged();
        v.assert(v.isAdmin(),"You must be admin",401);
        v.assert(doc, "Doc not found", 404);
        v.assert(params.action, "Param \"action\" not specified",400);
        v.assert(params.trkey, "Params \"trkey\" not specified",400);
        v.assert(params.action=="create" || (doc.triggers&&doc.triggers[params.trkey]),"Trigger key \""+params.trkey+"\" not found in doc.triggers", 400);
        var trkey = params.trkey, 
            tr = doc.triggers[params.trkey];

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
                if (tr.success) doc.triggers[trkey].error = tr.success;
                if (tr.storepositive) doc.triggers[trkey].storepositive = tr.storepositive;

                msg = "QUEUED trigger \""+trkey+"\"";
                break;
                
            case "done":
                // Moving trigger from triggers to triggered
                tr.done = v.now();
                tr.code = params.code;
                var ok = typeof tr.code == "number" && tr.code>=200 && tr.code<300;

                // parse response body as JSON if possible
                try { params.out = JSON.parse(params.out); }catch(ex){}

                // false response body are always stored
                // positive reponse body are stored only if allowed by storepositive
                if (params.out && (!ok || tr.storepositive)) 
                    tr.out = params.out;

                // preparing chained success/error triggers if any
                if (!ok && typeof tr.error=='object') {
                    if (params.out) {
                        tr.error.params = tr.error.params?tr.error.params:{};
                        tr.error.params.reason = params.out;
                    }
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
                msg = "DONE trigger \""+trkey+"\"";
                break;

            default:
                v.assert(false, "Invalid trigger action", 400);
                break;
        }
        return [doc,v.response({ok:true, msg:msg}),isNew?201:200];

    } catch(ex) {
        return [null,"TRIGGERJOB-COUCHAPP: "+ex.toString()];
    }
}