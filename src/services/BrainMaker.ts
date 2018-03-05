import {
    Brain,
    NodeBase,
    InputNodeBase,
    OutputNodeBase,
    MiddleNodeBase,
    NodeDependantRelationship,
    Enum
} from 'chaoscraft-shared'
import * as MinecraftData from 'minecraft-data';
class BrainMaker{
    protected nodeLayers:any = {}
    protected minecraftData = null;
    protected INPUT_KEYS = null;
    protected OUTPUT_KEYS = null;
    public create(options){
        let indexedNodes = {};
        this.minecraftData = MinecraftData;
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
            for(let ii = 0; ii < options.maxChainLength; ii++){
                this.nodeLayers[i] = [];
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
            let safeGuard = 0;
            let finished = false;
            let currRow = 0;
            let lastNode = this.nodeLayers.output[i];
            while(!finished){
                safeGuard += 1;
                let nextNodeRow = Math.round(Math.random() * (options.maxChainLength - currRow));
                currRow += nextNodeRow;
                let nextNodeIndex = Math.round(Math.random() * this.nodeLayers[currRow].length);
                let nextNode = this.nodeLayers[currRow][nextNodeIndex];
                lastNode.dependants.push({
                    id:nextNode.id,
                    weight: null
                })
                lastNode = nextNode;
                if(nextNodeRow == options.maxChainLength){
                    finished = true;
                }
                if(safeGuard >= 100){
                    throw new Error("Infinite Loop");
                }

            }
            let inputIndex = Math.floor(Math.random() * this.nodeLayers.input.length);
            let inputNode = this.nodeLayers.input[inputIndex];
            lastNode.dependants.push({
                id:inputNode.id,
                weight: null
            });

        }
        //TODO: Put Middle Node dependancy test
        let brainData = {};
        //Put all outputs but only the inputs and middles that are depended on
        function addNode(node){
            brainData[node.id] = node;
            node.dependants.forEach((dependant)=>{
                brainData[indexedNodes[dependant.id].id] = indexedNodes[dependant.id];
                addNode(node);
            })
        }
        this.nodeLayers.output.forEach((node)=>{
            addNode(node);
        })
        return brainData;

    }

    randInput(i){
        let inputKeyIndex = Math.round(Math.random() * this.INPUT_KEYS.length);
        let input = this.INPUT_KEYS[inputKeyIndex];
        let inputNode:any = {
            id:'input_' + i,
            base_type:'input',
            type:input,
        }
        switch(input){
            case(Enum.InputTypes.canSeeBlock):
                inputNode.target = {
                    type:'block',
                    id: this.randBlock()
                }
                break;
            case(Enum.InputTypes.canDigBlock):
                inputNode.target = {
                    type:'block',
                    id: this.randBlock()
                }
                break;
            case(Enum.InputTypes.canSeeEntity):
                inputNode.target = {
                    type:'entity',
                    id: this.randEntity()
                }
                break;

            case(Enum.InputTypes.hasInInventory):
                if(Math.round(Math.random()) == 0){
                    inputNode.target = {
                        type:'item',
                        id: this.randItem()
                    }
                }else{
                    inputNode.target = {
                        type:'block',
                        id: this.randBlock()
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
        let outputKeyIndex = Math.round(Math.random() * this.OUTPUT_KEYS.length);
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
        return this.minecraftData.blocksArray[Math.round(Math.random() * this.minecraftData.blocksArray.length)];
    }
    randItem(){
        return this.minecraftData.itemsArray[Math.round(Math.random() * this.minecraftData.itemsArray.length)];
    }
    randEntity(){
        return this.minecraftData.entitiesArray[Math.round(Math.random() * this.minecraftData.entitiesArray.length)];
    }
    randRecipe(){
        return this.minecraftData.recipes[Math.round(Math.random() * this.minecraftData.recipes.length)];
    }
}
export { BrainMaker }