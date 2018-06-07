import {
    Brain,
    NodeBase,
    InputNodeBase,
    OutputNodeBase,
    MiddleNodeBase,
    NodeDependantRelationship,
    Enum
} from 'chaoscraft-shared';
import * as config from 'config'
import * as MinecraftData from 'minecraft-data';
import * as _ from 'underscore';

class BrainMaker{
    protected nodeLayers:any = {}
    protected minecraftData = null;
    protected INPUT_KEYS = null;
    protected OUTPUT_KEYS = null;
    protected indexedNodes:any = {};
    public create(options){
        options.length =  options.length || config.get('brain.length');
        options.generation = options.generation || 0;
        options.maxChainLength = options.maxChainLength || config.get('brain.maxChainLength');
        options.inputNodePool = options.inputNodePool || config.get('brain.inputNodePool');

        this.indexedNodes = options.brainData || {};
        this.minecraftData = MinecraftData(config.get('minecraft.version'));
        this.INPUT_KEYS = Object.keys(Enum.InputTypes);
        //this.OUTPUT_KEYS = Object.keys(Enum.OutputTypes);
        this.OUTPUT_KEYS = [
            'placeBlock',
            'equip',
            'walkTo',
            'tossStack',

            'stopWalking',
            //'lookAt',
            'dig',
            'placeBlock',

            'attack',
            'activateItem',
            //'deactivateItem',
            'walkForward',
            'walkBack',
            'walkLeft',
            'walkRight',
            'jump',
            //'sneak',
            //'sprint',
            'clearControlStates',
            'lookLeft',
            'lookRight',
            'lookUp',
            'lookDown'
        ]
        let brain:Brain = null;
        this.nodeLayers.inputs = [];
        this.nodeLayers.outputs = [];
        for(let i = 0; i < options.maxChainLength; i++){
            this.nodeLayers[i] = [];
        }
        for(let i = 0; i < options.inputNodePool; i++){
            let inputNode = this.randInput({
                id:'input_' + i + '_' + options.generation
            });
            inputNode.originGen = options.generation;
            this.indexedNodes[inputNode.id] = inputNode;
            this.nodeLayers.inputs.push(inputNode);
        }



        //Setup our inputs and outputs first
        let newMaxOutputLength = options.length;
        let decayNodesLength = 0;
        let  passOnAdd = <number>config.get('brain.passOnAdd');
        let  passOnDecay = <number>config.get('brain.passOnDecay');
        if(options.generation){
            newMaxOutputLength =  Math.round(options.length * Math.pow((1 + passOnAdd), options.generation));
            decayNodesLength = Math.round(newMaxOutputLength * passOnDecay);


        }

        for(let i = 0; i < newMaxOutputLength - decayNodesLength; i++){
            //Start with an input

            this.nodeLayers[i] = [];
            for(let ii = 0; ii < options.maxChainLength; ii++){

                let middleNode = {
                    id: "middle_" +i + "_" + ii + "_" + options.generation,
                    "base_type":"middle",
                    "dependants":[],
                    originGen: options.generation,
                    weight: Math.round(Math.random() * 10)/10
                };
                this.nodeLayers[i].push(middleNode)
                this.indexedNodes[middleNode.id] = middleNode;
            }

        }
        if(options.brainData){
            //Load brain data into nodes
            Object.keys(options.brainData).forEach((nodeId)=>{
                let node = options.brainData[nodeId];

                node.id = nodeId;
                switch(node.base_type){
                    case('output'):
                        this.nodeLayers.outputs.push(node);
                        break;
                    case('input'):
                        this.nodeLayers.inputs.push(node);
                        break;
                    case('middle'):
                        let parts = nodeId.split('_');
                        this.nodeLayers[parseInt(parts[1])][parseInt(parts[2])] = node;
                        break;
                    default:
                        throw new Error("Invalid node.base_type:" + node.base_type)
                }
            })
        }

        this.nodeLayers.outputs = _.sortBy(this.nodeLayers.outputs, (node)=>{
            return (0 - node.activationCount);/*outputFiredCount;*/
        });

        for(let i = 0; i < decayNodesLength; i++){
            let index:number = null;
            switch(config.get('brain.outputs_remove_mode')){
                case('in_active'):
                     index = this.nodeLayers.outputs.length - 1;
                    this.nodeLayers.outputs.splice(index, 1);
                break;
                default:
                case('random'):
                    //Pick random outputnodes and remove them
                    index = Math.floor(this.nodeLayers.outputs.length * Math.random());
                    this.nodeLayers.outputs.splice(index, 1);
                    //Ideally during the final phase the dependants will be removed
            }

        }
        let neededOutputs = newMaxOutputLength - this.nodeLayers.outputs.length;

        for(let i = 0; i < neededOutputs; i++){
            //Start with an input


            let outputNode = this.randOutput({
                id: "output_" + i + "_" + options.generation
            })
            outputNode.originGen = options.generation;
            this.indexedNodes[outputNode.id] = outputNode;

            this.nodeLayers.outputs.push(outputNode);

        }




        for(let i = 0; i < newMaxOutputLength; i++){
            //Start with an input


            let lastNode = this.nodeLayers.outputs[i];
            if(!lastNode){
                return console.error("Not enough valid outputs");
            }

            function addDependants(node, currRow){
                if(!node.dependants){
                    return;
                }
                if(node.dependants.length >= <number>config.get('brain.maxDependants')){
                    return;
                }
                let dependantCount:number = Math.floor(Math.random() * (<number>config.get('brain.maxDependants') - <number>config.get('brain.maxDependants'))) + <number>config.get('brain.maxDependants');
                for(let ii = 0; ii < dependantCount; ii ++){
                    let foundNodeWithNotManyDependants = false;
                    let nextNode = null;
                    let safeGuard = 0;
                    let nextNodeRow: any = null;
                    while(!foundNodeWithNotManyDependants) {
                        let est = Math.round(Math.random() * (options.maxChainLength - currRow)) + 1;
                        nextNodeRow = est + currRow;
                        if (nextNodeRow >= options.maxChainLength) {
                            nextNodeRow = 'inputs';
                        }
                        let nextNodeIndex = Math.floor(Math.random() * this.nodeLayers[nextNodeRow].length);

                        nextNode = this.nodeLayers[nextNodeRow][nextNodeIndex];


                        safeGuard +=1;
                        if(safeGuard > 100){
                            console.error("Exiting out Safe Guard");
                            return
                        }
                        foundNodeWithNotManyDependants = true;//TODO: Remove Hack
                    }

                    node.dependants.push({
                        id:nextNode.id,
                        weight: null
                    })


                    if(nextNodeRow == 'inputs') {
                       return;
                    }
                    addDependants.apply(this, [nextNode, nextNodeRow]);
                }
            }
            addDependants.apply(this, [lastNode, 0]);

        }


        //Setup some basic instincts
        if(!options.generation) {
            this.setupBasicInstincts();
        }
        this.sanityCheck();

        let brainData = {};

        //Put all outputs but only the inputs and middles that are depended on
        let indexedNodes = this.indexedNodes;
        function addNode(node){


            brainData[node.id] = node;
            if(!node.dependants){
               return ;
            }

            node.dependants.forEach((dependant)=>{
                if(!indexedNodes[dependant.id]){
                    console.error("Missing Node: " + dependant.id, node);
                    return;
                }
                brainData[indexedNodes[dependant.id].id] = indexedNodes[dependant.id];
                addNode(brainData[indexedNodes[dependant.id].id]);
            })
        }
        this.nodeLayers.outputs.forEach((node)=>{
            node.activationCount/*outputFiredCount*/ = 0;
            addNode(node);
        })

        return brainData;

    }
    setupBasicInstincts(){


        //Jump in water
        let inputNode:any = {
            id:'input_' +this.nodeLayers.inputs.length,
            base_type:'input',
            type:Enum.InputTypes.isIn,
            target:{
                type:'block',
                block:[8,9]
            }
        }
        this.indexedNodes[inputNode.id] = inputNode;
        this.nodeLayers.inputs.push(inputNode)

        let outputNode:any = {
            id:'output_' + this.nodeLayers.outputs.length,
            base_type:'output',
            type:'jump',
            dependants:[{
                id: inputNode.id
            }]
        }
        this.indexedNodes[outputNode.id] = outputNode;
        this.nodeLayers.outputs.push(outputNode)




        //Setup Collision
        inputNode = {
            id:'input_' +this.nodeLayers.inputs.length,
            base_type:'input',
            type:Enum.InputTypes.collision,
            target:{}
        }
        this.indexedNodes[inputNode.id] = inputNode;
        this.nodeLayers.inputs.push(inputNode)


        let KEYS = [
            'lookLeft',
            'lookRight',
            'jump',
            'dig'
        ];


        let outputType:string = KEYS[Math.floor(Math.random() * KEYS.length)];
        outputNode = {
            id:'output_' + this.nodeLayers.outputs.length,
            base_type:'output',
            type:outputType,
            dependants:[{
                id: inputNode.id
            }]
        }
        this.indexedNodes[outputNode.id] = outputNode;
        this.nodeLayers.outputs.push(outputNode)






        //Equip some stuff
        inputNode = {
            id:'input_' +this.nodeLayers.inputs.length,
            base_type:'input',
            type:Enum.InputTypes.hasInInventory,
            target:{
                type:'block',
                block:[1,2,3,4,5,6,7, 12,13,14]
            }
        }
        this.indexedNodes[inputNode.id] = inputNode;
        this.nodeLayers.inputs.push(inputNode)

        outputNode = {
            id:'output_' + this.nodeLayers.outputs.length,
            base_type:'output',
            type:'equip',
            dependants:[{
                id: inputNode.id
            }]
        }
        this.indexedNodes[outputNode.id] = outputNode;
        this.nodeLayers.outputs.push(outputNode)





    }
    sanityCheck(){

        //Iterate through outputs
        //Mark child nodes as `_depended`
        this.nodeLayers.outputs.forEach((node)=>{
            this.sanityCheckOutputNode(node);
        })

        //Iterate through all nodes
        Object.keys(this.indexedNodes).forEach((key)=>{
            let node = this.indexedNodes[key];

            if(node.dependants){
                let removeIndexes = [];
                node.dependants.forEach((dependant, index)=>{
                    let childNode = this.indexedNodes[dependant.id];
                    if(!childNode || !childNode._depended){
                        removeIndexes.push(index);
                    }
                })
                removeIndexes.forEach((index)=>{
                    node.dependants.splice(index,1);
                })
            }
            if(node._depended) {
                return;
            }
            let nodeCollection = null;
            switch(node.base_type){
                case('output'):
                    nodeCollection = this.nodeLayers.outputs;
                break;
                case('input'):
                    nodeCollection = this.nodeLayers.inputs;
                break;
                case('middle'):
                    //nodeCollection = this.nodeLayers.outputs;
                break;
                default:
                    throw new Error("Invalid node.base_type: " + node.base_type);
            }
            if(nodeCollection) {
                let nodeFoundIndex = null;
                nodeCollection.forEach((childNode, index) => {
                    if (childNode.id !== node.id) {
                        return;
                    }
                    nodeFoundIndex = index;

                })
                if (_.isNull(nodeFoundIndex) ) {
                    console.error("Node not found: " + node.id);
                }else{
                    nodeCollection.splice(nodeFoundIndex, 1);
                }
            }
            //console.log("Removing: ", key);
            delete(this.indexedNodes[key]);


        })
        Object.keys(this.indexedNodes).forEach((key)=>{
            delete(this.indexedNodes[key]._depended)
        })
        //Omit outputs as they have already been tested
        //Delete any node not marked as `_depended`
        //Remove the `_depended` variable

        //If dependants < 2 remove middle node
    }
    sanityCheckOutputNode(dependantNode, parentNode?){
        //console.log("TESTING: ", dependantNode.id);

        let hasInput = false;
        if(!dependantNode.dependants){
            //console.log("RESULTS(No dependants): ", dependantNode._depended);
            return false;
        }

        dependantNode.dependants.forEach((_dependantNode, index)=>{
            let node = this.indexedNodes[_dependantNode.id];
            if(node.base_type == 'output'){
                throw new Error("WTF?!?!");
            }
            if(node.base_type == 'input'){
                hasInput = true;
                node._depended = true;
                //console.log("INPUT DEPENDED:", node.id);
                return;
            }
            hasInput = this.sanityCheckOutputNode(node, dependantNode);
            if(hasInput){
                //console.log("MIDDLE DEPENDED:", node.id);
                node._depended = true;
            }
        })
        //Delete middle nodes with out inputs

        if(hasInput){
            dependantNode._depended = true;
            if(parentNode && dependantNode.dependants.length == 1){
                parentNode.dependants = dependantNode.dependants;
                dependantNode._depended = false;
            }
        }
        //console.log("RESULTS: ", dependantNode._depended);
        return hasInput;

    }
    randInput(options:any){
        let inputKeyIndex = Math.floor(Math.random() * this.INPUT_KEYS.length);
        let input = this.INPUT_KEYS[inputKeyIndex];
        if(!options.id){
            throw new Error("Must pass in an `options.id`")
        }
        let inputNode:any = {
            id:options.id,
            base_type:'input',
            type:input,
            target:{},
            weight: Math.round(Math.random() * 10)/10
        }
        switch(input){

            case(Enum.InputTypes.blockUpdate):
            case(Enum.InputTypes.diggingCompleted):
            case(Enum.InputTypes.diggingAborted):
            case(Enum.InputTypes.blockBreakProgressEnd):
            case(Enum.InputTypes.blockBreakProgressObserved):
            case(Enum.InputTypes.chestLidMove):
            case(Enum.InputTypes.blockAt):
           /* case(Enum.InputTypes.canSeeBlock):
            case(Enum.InputTypes.canDigBlock):
            case(Enum.InputTypes.canTouchBlock):
            case(Enum.InputTypes.isOn):
*/
                inputNode.target = {
                    type:'block',
                    block: [],
                    position: PositionDeltaRange.genRandom({}).toObject()
                }
                if(input == Enum.InputTypes.canSeeBlock){
                    inputNode.target.maxDistance = Math.floor(Math.random() * 20);
                }

                for(let i = 0; i < config.get('brain.maxTargets'); i++){
                    inputNode.target.block.push(this.randBlock().id);
                }
            break;

            case(Enum.InputTypes.entityAt):
            case(Enum.InputTypes.entityMoved):
            case(Enum.InputTypes.entitySwingArm):
            case(Enum.InputTypes.entityHurt):
            case(Enum.InputTypes.entitySpawn):
            case(Enum.InputTypes.entityUpdate):
            //case(Enum.InputTypes.canSeeEntity):
            case(Enum.InputTypes.playerCollect):
                switch(Math.floor(Math.random() * 3)){
                    case(0):
                        inputNode.target = {
                            type:'entity',
                            entityTypes: []
                        }
                        for(let i = 0; i < config.get('brain.maxTargets'); i++){
                            inputNode.target.entityTypes.push(this.randEntity().id);
                        }
                    break;
                    case(1):

                        inputNode.target = {
                            type:'entity',
                            meta_blockId: []
                        }
                        for(let i = 0; i < config.get('brain.maxTargets'); i++){
                            inputNode.target.meta_blockId.push(this.randItem().id);
                        }
                    break;
                    case(2):
                        inputNode.target = {
                            type:'entity',
                            is_holding: []
                        }
                        for(let i = 0; i < config.get('brain.maxTargets'); i++){
                            inputNode.target.is_holding.push(this.randItem().id);
                        }
                    break;
                    default:
                        throw new Error("Your math is off");
                }
                inputNode.position = PositionDeltaRange.genRandom({}).toObject();

            break;

            case(Enum.InputTypes.hasInInventory):
            case(Enum.InputTypes.hasEquipped):

                if(Math.round(Math.random()) == 0){
                    inputNode.target = {
                        type:'item',
                        item: []//this.randItem().id
                    }
                    for(let i = 0; i < config.get('brain.maxTargets'); i++){
                        inputNode.target.item.push(this.randItem().id);
                    }
                }else{
                    inputNode.target = {
                        type:'block',
                        block: []//this.randBlock().id
                    }
                    for(let i = 0; i < config.get('brain.maxTargets'); i++){
                        inputNode.target.block.push(this.randBlock().id);
                    }
                }
                inputNode.slot = Math.round(Math.random() * 9);

            break;
            case(Enum.InputTypes.hasRecipeInInventory):
                inputNode.target = {
                    type:'recipe',
                    recipe: []//this.randItem().id
                }
                for(let i = 0; i < config.get('brain.maxTargets'); i++){
                    let recipe = this.randRecipe();
                    inputNode.target.recipe.push(recipe);//We convert this to a real recipe list on the other side
                }
            break;
            case(Enum.InputTypes.isHolding):
                inputNode.target = {
                    type:'entity',
                    is_holding: []
                }
                for(let i = 0; i < config.get('brain.maxTargets'); i++){
                    inputNode.target.is_holding.push(this.randItem().id);
                }
            break;
            case(Enum.InputTypes.onCorrelateAttack):
                /*inputNode.target = {
                 type:'entity',
                 id: this.randEntity()
                 }*/
                break;


        }
        return inputNode;

    }

    randOutput(options:any){
        let outputKeyIndex = Math.floor(Math.random() * this.OUTPUT_KEYS.length);
        let output = this.OUTPUT_KEYS[outputKeyIndex];
        if(!options.id){
            throw new Error("Must pass in an `options.id`")
        }
        let outputNode:any = {
            id:options.id,
            base_type:'output',
            type:output,
            dependants:[],

        }
        switch(output) {
            case(Enum.OutputTypes.equip):
                outputNode.destination = 'hand';

            break;
            case(Enum.OutputTypes.craft):
                outputNode.target = {
                    type:'recipe',
                    recipe: []//this.randItem().id
                }
                for(let i = 0; i < config.get('brain.maxTargets'); i++){
                    let recipe = this.randRecipe();
                    outputNode.target.recipe.push(recipe);//We convert this to a real recipe list on the other side
                }
            break;
            case(Enum.OutputTypes.attack):
                outputNode.target = {
                    entityType: ['mob']
                }
            break;
            case(Enum.OutputTypes.openChest):
                outputNode.target = {
                    block:[54]
                }
            break;
            case(Enum.OutputTypes.openFurnace):
                outputNode.target = {
                    block:[
                        61,// Furnace
                        62, //Burning Furnace
                        343 //Minecart with Furnace
                    ]
                }
            break;
            case(Enum.OutputTypes.openDispenser):
                outputNode.target = {
                    block:[
                        23
                    ]
                }
            break;
            case(Enum.OutputTypes.openEnchantmentTable):
                outputNode.target = {
                    block:[
                        116
                    ]
                }
            break;
            case(Enum.OutputTypes.openEntity):
            case(Enum.OutputTypes.activateEntity):
            case(Enum.OutputTypes.useOn):
                outputNode.target = {
                    type:'entity',
                    entityTypes: []
                }
                for(let i = 0; i < config.get('brain.maxTargets'); i++){
                    outputNode.target.entityTypes.push(this.randEntity().id);
                }
            break;
            case(Enum.OutputTypes.openVillager):
            case(Enum.OutputTypes.trade):

            break;
        }
        outputNode.target = {};

        outputNode.target.position = new PositionDeltaRange({
            xDelta:{
                min: -1,
                max: 1
            },
            yDelta:{
                min: -1,
                max: 1
            },
            zDelta:{
                min: -1,
                max: 1
            },
        })
        return outputNode;
    }
    randBlock(){
        return this.minecraftData.blocksArray[Math.floor(Math.random() * this.minecraftData.blocksArray.length)];
    }
    randItem(){
        return this.minecraftData.itemsArray[Math.floor(Math.random() * this.minecraftData.itemsArray.length)];
    }
    randEntity(){
        return this.minecraftData.entitiesArray[Math.floor(Math.random() * this.minecraftData.entitiesArray.length)];
    }
    randRecipe(){
        let rKeys = Object.keys(this.minecraftData.recipes);
        return rKeys[Math.floor(Math.random() * rKeys.length)];
    }
}
class PositionDeltaRange{
    public xDelta:any;
    public yDelta:any;
    public zDelta:number;
    constructor(options){
        this.xDelta = options.xDelta;
        this.yDelta = options.yDelta;
        this.zDelta = options.zDelta;
    }
    public static genRandom(options){

        let rangeData:any = {};

        rangeData.xDelta = PositionDeltaRange.getRandomSingleRange(options);

        rangeData.yDelta = PositionDeltaRange.getRandomSingleRange(options);

        rangeData.zDelta = PositionDeltaRange.getRandomSingleRange(options);
        return new PositionDeltaRange(rangeData);

    }
    public static getRandomSingleRange(options){
        options.maxVisibilityRange = options.maxVisibilityRange || <number>config.get('brain.max_visibility_range');
        let range:any = {
            min: Math.round(Math.random() * options.maxVisibilityRange * 2) - options.maxVisibilityRange
        }

        let remainingSpan  = (options.maxVisibilityRange  - range.min);
        range.max = (
            Math.round(Math.random() * remainingSpan) + range.min
        )
        return range;
    }
    toObject(){
        return {
            xDelta: this.xDelta,
            yDelta: this.yDelta,
            zDelta: this.zDelta,
        }

    }
    match(location){


    }
}
export { BrainMaker }