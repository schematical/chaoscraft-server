import {
    Brain,
    NodeBase,
    InputNodeBase,
    OutputNodeBase,
    MiddleNodeBase,
    NodeDependantRelationship,
    Enum
} from 'chaoscraft-shared'
import * as config from 'config'
import * as MinecraftData from 'minecraft-data';
class BrainMaker{
    protected nodeLayers:any = {}
    protected minecraftData = null;
    protected INPUT_KEYS = null;
    protected OUTPUT_KEYS = null;
    public create(options){
        options.length =  options.length || config.get('brain.length');
        options.maxChainLength = options.maxChainLength || config.get('brain.maxChainLength');
        let indexedNodes = {};
        this.minecraftData = MinecraftData('1.12.2');
        this.INPUT_KEYS = Object.keys(Enum.InputTypes);
        this.OUTPUT_KEYS = Object.keys(Enum.OutputTypes);
        let brain:Brain = null;
        this.nodeLayers.inputs = [];
        this.nodeLayers.outputs = [];
        for(let i = 0; i < options.maxChainLength; i++){
            this.nodeLayers[i] = [];
        }
        //Setup our inputs and outputs first
        for(let i = 0; i < options.length; i++){
            //Start with an input

            let inputNode = this.randInput(i);
            indexedNodes[inputNode.id] = inputNode;
            let outputNode = this.randOutput(i);
            indexedNodes[outputNode.id] = outputNode;
            this.nodeLayers.inputs.push(inputNode);
            this.nodeLayers.outputs.push(outputNode);
            this.nodeLayers[i] = [];
            for(let ii = 0; ii < options.maxChainLength; ii++){

                let middleNode = {
                    id: "middle_" +i + "_" + ii,
                    "base_type":"middle",
                    "dependants":[]
                };
                this.nodeLayers[i].push(middleNode)
                indexedNodes[middleNode.id] = middleNode;
            }

        }

        for(let i = 0; i < options.length; i++){
            //Start with an input


            let lastNode = this.nodeLayers.outputs[i];


            function addDependant(node, currRow){
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
                        let nextNodeIndex = Math.floor(Math.random() * this.nodeLayers[currRow].length);

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
                    addDependant.apply(this, [nextNode, nextNodeRow]);
                }
            }
            addDependant.apply(this, [lastNode, 0]);

        }



        let brainData = {};

        //Put all outputs but only the inputs and middles that are depended on
        function addNode(node){


            brainData[node.id] = node;
            if(!node.dependants){
               return ;
            }

            node.dependants.forEach((dependant)=>{
                brainData[indexedNodes[dependant.id].id] = indexedNodes[dependant.id];
                addNode(brainData[indexedNodes[dependant.id].id]);
            })
        }
        this.nodeLayers.outputs.forEach((node)=>{
            addNode(node);
        })
        return brainData;

    }

    randInput(i){
        let inputKeyIndex = Math.floor(Math.random() * this.INPUT_KEYS.length);
        let input = this.INPUT_KEYS[inputKeyIndex];
        let inputNode:any = {
            id:'input_' + i,
            base_type:'input',
            type:input,
            target:{}
        }
        switch(input){

            case(Enum.InputTypes.blockUpdate):
            case(Enum.InputTypes.diggingCompleted):
            case(Enum.InputTypes.diggingAborted):
            case(Enum.InputTypes.blockBreakProgressEnd):
            case(Enum.InputTypes.blockBreakProgressObserved):
            case(Enum.InputTypes.chestLidMove):
            case(Enum.InputTypes.canSeeBlock):
            case(Enum.InputTypes.canDigBlock):
                inputNode.target = {
                    type:'block',
                    block: this.randBlock().id
                }
                break;

            case(Enum.InputTypes.entityMoved):
            case(Enum.InputTypes.entitySwingArm):
            case(Enum.InputTypes.entityHurt):
            case(Enum.InputTypes.entitySpawn):
            case(Enum.InputTypes.entityUpdate):
            case(Enum.InputTypes.canSeeEntity):
            case(Enum.InputTypes.playerCollect):
                inputNode.target = {
                    type:'entity',
                    entity: this.randEntity().id
                }
                break;

            case(Enum.InputTypes.hasInInventory):
                if(Math.round(Math.random()) == 0){
                    inputNode.target = {
                        type:'item',
                        item: this.randItem().id
                    }
                }else{
                    inputNode.target = {
                        type:'block',
                        block: this.randBlock().id
                    }
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
    randOutput(i:number){
        let outputKeyIndex = Math.floor(Math.random() * this.OUTPUT_KEYS.length);
        let output = this.OUTPUT_KEYS[outputKeyIndex];

        let outputNode:any = {
            id:'output_' + i,
            base_type:'output',
            type:output,
            dependants:[]
        }
        switch(output) {
            case(Enum.OutputTypes.equip):
                outputNode.destination = 'hand';
            break;
        }
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
        return this.minecraftData.recipes[Math.floor(Math.random() * this.minecraftData.recipes.length)];
    }
}
export { BrainMaker }