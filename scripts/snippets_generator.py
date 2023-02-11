import argparse
import os
import json

DESC_HEADER = "//DESC:"
LEVEL_HEADER = "//LEVEL:"
ID_HEADER = "//ID:"

LANGS = ['ro', 'en']

def determineLang(pathFileName):
    for lang in LANGS:
        if '.' + lang + '.js' in pathFileName:
            return lang

    return 'ro'

def extractSnippets(code_lines):
    snippets = []

    is_first_desc_header = True
    desc_value = ""
    level_value = ""
    code = ""
    id = ""

    for line in code_lines:
        if DESC_HEADER in line:            
            if is_first_desc_header:            
                is_first_desc_header = False
            else:
                snippets.append({'code': code[:-1], 'desc' : desc_value, 'level': level_value, 'id': id})
                desc_value = ''
                level_value = ''
                code = ''
                id = ''  
            desc_value = line.replace(DESC_HEADER, '').strip()

        elif LEVEL_HEADER in line and level_value == '':
            level_value = line.replace(LEVEL_HEADER, '').strip()
        elif ID_HEADER in line and id == '':
            id = line.replace(ID_HEADER, '').strip()
        else:
            code += line
        
    if desc_value != '':
        snippets.append({'code': code.rstrip('\n'), 'desc' : desc_value, 'level': level_value, 'id': id})
    elif code != '':
        snippets.append({'code': code.rstrip('\n'), 'desc' : desc_value, 'level': level_value, 'id': id})

    return snippets

def processSnippet(inputFolder, pathFileName, dir, jsonData):
    if dir != None:
        jsonFile = inputFolder + dir.replace('\\', '-') + ".json"
    
    lang = determineLang(pathFileName)

    print("Processing file (" + lang + ") " + pathFileName + ' to '+ jsonFile)

    if not jsonFile in jsonData:
        jsonData[jsonFile] = {}

    if not lang in jsonData[jsonFile]:
        jsonData[jsonFile][lang] = []

    with open(os.getcwd() + os.path.sep + pathFileName, 'r') as jsFile:    
        code_lines = jsFile.readlines()

        for snippet in extractSnippets(code_lines):            
            snippet['src'] = pathFileName.replace(inputFolder, '')
            jsonData[jsonFile][lang].append(snippet)

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
            if fileName.endswith('snip'):
                jsonData = processSnippet(inputFolder, fileName, dir, jsonData)

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