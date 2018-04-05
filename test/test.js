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
    describe('gen0', function() {

        brainholder[0] = brainMaker.create({});
        console.log(getCounts(brainholder[0]));
       /* it('should return -1 when the value is not present', function() {
            assert.equal([1,2,3].indexOf(4), -1);
        });*/
    });

    describe('gen1', function() {

        brainholder[1] = brainMaker.create({
            brainData: brainholder[0],
            generation: 1
        });
        console.log(getCounts(brainholder[1]));
       /* it('should return -1 when the value is not present', function() {
            assert.equal([1,2,3].indexOf(4), -1);
        });*/
    });
    describe('gen2', function() {

        brainholder[2] = brainMaker.create({
            brainData: brainholder[1],
            generation: 2
        });
        console.log(getCounts(brainholder[2]));
        /*it('should return -1 when the value is not present', function() {
            assert.equal([1,2,3].indexOf(4), -1);
        });*/
    });
    describe('gen3', function() {

        brainholder[3] = brainMaker.create({
            brainData: brainholder[2],
            generation: 3
        });
        console.log(getCounts(brainholder[3]));
        /*it('should return -1 when the value is not present', function() {
         assert.equal([1,2,3].indexOf(4), -1);
         });*/
    });

    describe('gen4', function() {

        brainholder[4] = brainMaker.create({
            brainData: brainholder[3],
            generation: 4
        });
        console.log(getCounts(brainholder[4]));
        /*it('should return -1 when the value is not present', function() {
         assert.equal([1,2,3].indexOf(4), -1);
         });*/
    });

});