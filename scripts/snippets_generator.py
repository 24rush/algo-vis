import argparse
import os
import json
import re
import markdown

LANGS = ['ro', 'en']

def determineLang(pathFileName):
    for lang in LANGS:
        if '.' + lang + '.' in pathFileName:
            return lang

    return 'ro'

def processKeyValue(key, value):
    # if value array then load it as array
    if (len(value) > 1 and value[0] == '[' and value[len(value) - 1] == ']'):
        value = json.loads(value)

    if (key == "statement" or key == "explanation" or key == "answer"):                
        if ("<pre><code>" in value):
            value = value.replace("<pre><code>\n", "<pre><code>").replace("\n</pre></code>", "</pre></code>")        
        else:            
            value = markdown.markdown(value)

        value = value.replace('<p>', '').replace('</p>', '')

    return value

def extractData(quizFile):
    topObject = [{}]
    currObj = topObject[0]    
    objRefs = []
    levels = []
    arrayLevels = 0
    level = 0
    currObjLevel = 0

    rgxHeaderValue = r"^\s*\Â§(\s*\w+)\s*(:*)\s*((\[+\n*)|[^\Â§]*)$"
    matches = re.findall(rgxHeaderValue, quizFile, flags=re.M)

    if (not len(matches)):
        print ("Warning: NO MATCHES")

    for match in matches:
        # Mark the level of the previous key before going into current one
        level = int(match[0].count(' ') / 4) + arrayLevels

        key = match[0].strip()
        value = match[2].strip()

        isObject = (match[1] == None or match[1] == '')
        isStartOfArrayObjects = (value == '[')
        isEndOfArrayObjects = (value == ']')

        value = processKeyValue(key, value)
                
        if not isEndOfArrayObjects and len(levels) and currObjLevel > level:
            while (len(objRefs) and currObjLevel > level):
                currObj = objRefs.pop(0)
                currObjLevel = levels.pop(0)

        if isObject:     
            # Starting new object, push current one and mark its level
            objRefs.insert(0, currObj); levels.insert(0, currObjLevel)
            
            if key in currObj: # Check if key already introduced in object
                raise Exception('Key {0} already exists in object'.format(key))

            currObj[key] = {}
            currObj = currObj[key]
            currObjLevel = currObjLevel + 1
            continue

        if isStartOfArrayObjects:
            arrayLevels = arrayLevels + 1

            # Required for knowing where to come back after array ends
            objRefs.insert(0, currObj); levels.insert(0, currObjLevel)

            # Required for adding new objects to it
            currObj[key] = [{}]
            objRefs.insert(0, currObj[key]); levels.insert(0, currObjLevel + 1)
            
            currObj = currObj[key][0]
            currObjLevel = currObjLevel + 2
            continue

        if isEndOfArrayObjects:
            arrayLevels = arrayLevels - 1

            objRefs.pop(0); levels.pop(0)
            currObj = objRefs.pop(0); 
            currObjLevel = levels.pop(0)
            continue
        
        if key in currObj:
            currObj = {}
            if len(objRefs):
                objRefs[0].append(currObj)
            else:
                topObject.append(currObj)

        if key == 'id': # Check that ids are unique by iterating the parent array            
            for sibling in objRefs[0] if len(objRefs) else topObject:
                if type(sibling) is str:
                    continue

                if 'id' in sibling and sibling['id'] == value:
                    raise Exception('Key {0} already exists in array in {1}'.format(value, sibling))

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
        fileToWrite = "build" + os.path.sep + jsonObj
        print('Writing file ' + fileToWrite)

        if not os.path.exists(os.path.dirname(fileToWrite)):
            os.makedirs(os.path.dirname(fileToWrite))

        #with open(jsonObj, "w") as f:
        #    content = json.dump(jsonData[jsonObj], f, ensure_ascii=False)            

        with open(fileToWrite, "w") as f:
            content = json.dump(jsonData[jsonObj], f, ensure_ascii=False)            

if __name__ == "__main__":    
    parser = argparse.ArgumentParser()
    
    parser.add_argument("-i", "--input", help = "Input folder or input file", required=True)    
    args = parser.parse_args()

    writeJson(generateJsons(args.input))