var assert = require('assert');
const BrainMaker = require('../dist/services/BrainMaker');
let brainholder = {};
describe('BrainMaker', function() {
    let brainMaker = new BrainMaker.BrainMaker();

    function getCounts(brainData){
        let nodeAgeTotals = {
            total: 0
        };
        Object.keys(brainData).forEach((nodeId)=>{
            let node = brainData[nodeId];
            node.originGen = node.originGen || 0;
            nodeAgeTotals[node.originGen] = nodeAgeTotals[node.originGen] || 0;
            nodeAgeTotals[node.originGen] += 1;
            nodeAgeTotals.total += 1;
        })
        return nodeAgeTotals;
    }
    for(var i = 0; i < 50; i++){
        describe('gen' + i,
            ((i)=>{
                return ()=> {
                    brainholder[i] = brainMaker.create({
                        brainData: brainholder[i - 1] || null,
                        generation: i
                    });
                    //console.log(getCounts(brainholder[i]));
                     it('inputs should have types', function() {
                         Object.keys(brainholder[i]).forEach((nodeId)=> {
                            let node = brainholder[i][nodeId];
                            switch(node.base_type){
                                case('input'):

                                    if(!node.type){
                                        console.error(Object.keys(node));
                                        throw new Error("Node is missing `type` property");
                                    }
                            }

                         })
                     });
                }
            })(i)
        );
    }




});