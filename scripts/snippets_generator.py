import argparse
import os
import json
import re

LANGS = ['ro', 'en']

def determineLang(pathFileName):
    for lang in LANGS:
        if '.' + lang + '.' in pathFileName:
            return lang

    return 'ro'

def extractData(quizFile):
    topObject = {}
    currObj = topObject
    objRefs = []
    inArraySeq = False

    rgxHeaderValue = r"^\s*\Â§\s*(\w+)\s*(:*)\s*((\[+\n*)|[^\Â§]*)$"

    matches = re.findall(rgxHeaderValue, quizFile, flags=re.M)

    if (not len(matches)):
        print ("Warning: NO MATCHES")

    for match in matches:        
        key = match[0].strip()
        value = match[2].strip()
        
        isObject = (match[1] == None or match[1] == '')
        isStartOfArrayObjects = (value == '[')
        isEndOfArrayObjects = (value == ']')

        # if value array then load it as array
        if (len(value) > 1 and value[0] == '[' and value[len(value) - 1] == ']'):
            value = json.loads(value)            

        if isObject:        
            currObj = (objRefs[1] if len(objRefs) > 1 else topObject)            
            currObj[key] = {}
            objRefs.insert(0, currObj)            
            currObj = currObj[key]   
                 
            continue

        if isStartOfArrayObjects:              
            currObj[key] = [{}]
            objRefs.insert(0, currObj)
            objRefs.insert(0, currObj[key])                        
            currObj = currObj[key][0]            

            inArraySeq = True            
            continue

        if isEndOfArrayObjects and inArraySeq:        
            objRefs.pop(0)            
            currObj = objRefs[0]
            
            inArraySeq = False            
            continue
        
        if key in currObj:
            currObj = {}
            currObj[key] = value

            if len(objRefs) <= 1:
                topObject = [topObject]
                objRefs.insert(0, topObject)

            objRefs[0].append(currObj)
            
            continue
                
        currObj[key] = value        
    
    return topObject

def process(inputFolder, pathFileName, dir, jsonData):    
    lang = determineLang(pathFileName)

    if dir != None:
        jsonFile = inputFolder + pathFileName.replace(inputFolder, '').replace('\\', '-')

    jsonFile = jsonFile.replace('.' + lang, '')
    jsonFile = jsonFile.replace('.snip', '.json').replace('.quiz', '.json')

    print("Processing file (" + lang + ") " + pathFileName + ' to '+ jsonFile)

    if not jsonFile in jsonData:
        jsonData[jsonFile] = {}

    with open(os.getcwd() + os.path.sep + pathFileName, 'r') as jsFile:    
        dataObjs = extractData(jsFile.read())                
        jsonData[jsonFile][lang] = dataObjs
        jsonData[jsonFile]['src-' + lang] = pathFileName.replace(inputFolder, '')        

    return jsonData

def generateJsons(inputFolder):
    jsonData = {}  
    
    if not inputFolder.endswith(os.path.sep):
        inputFolder = inputFolder + os.path.sep

    for root, _, files in os.walk(inputFolder):
        for name in files:
            idxSlash = root.find('\\')
            dir = None
            if idxSlash != -1:
                dir = root[idxSlash+1:]

            fileName = os.path.join(root, name)
            
            if fileName.endswith('snip') or fileName.endswith('quiz'):
                jsonData = process(inputFolder, fileName, dir, jsonData)

    return jsonData

def writeJson(jsonData):
    for jsonObj in jsonData:    
        print('Writing file ' + jsonObj)

        with open(jsonObj, "w") as f:
            content = json.dumps(jsonData[jsonObj])        
            f.write(content)

if __name__ == "__main__":    
    parser = argparse.ArgumentParser()
    
    parser.add_argument("-i", "--input", help = "Input folder or input file", required=True)    
    args = parser.parse_args()

    writeJson(generateJsons(args.input))