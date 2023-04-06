# Start web server #
``` npx webpack serve --live-reload --static assets --static wordpress/assets```

# Start chrome to allow SAB #
``` npm run chrome-sab ```

# Run tests #
``` npm run test ```

# Generate snippets or quizzes #
### General structure of files ###
#### Key - values
 ``` 
 § <key> : <value> 
 ```
#### Objects
 ``` 
 § <key> 
 § <property> : <value>
 ```
#### Array of objects
```
§ <key> : [
§ <property> : <value>
§ <key> : ]
```

```< value >``` can be: string, arrays, numbers

### Create quiz or snippet ###
- create a .quiz or .snip file
- use § as wildcard for sections, use 4 space indentation for specifying structure
- sections named _statement_ can be written using markdown and their content will be converted to html in the output json
- structure of quiz question
§order: ["0", ...]
§0
§    statement: <>
§    correct: [0]
§    answers: [
§        id: 0
§        answer: ..
§        id: ..
§        answer: ..
§    answers: ]

### Run generator from project root ###
``` npm run gen-all ```
Output json will be in folder pointed by ```-i```

### HTML ###
- use ```av-quiz``` class on button to launch the quiz and ```config-id``` attribute to specify the json file for the quiz data
- use ```<av-elem type="ieditor" list-of-attributes-for-algovis></av-elem>``` to open an inline code editor
- use ```<span class="av-tippie" title="Tip">*</span>```
- use ```<span class="list-arrow"></span>``` for arrows before text

#### Styles ####
- ```av-wp-styles.css``` contains all styling done to the wordpress theme
- ```av-styles.css``` contains all the styling needed by the plugin
- both style files need to be deployed manually to themes/< current theme >

# Snippet files and standalone editor deployment#
- .json snippet files to ``` public_html/wp-content/uploads/2023/snips ```
- standalone/index.html to ``` public_html/wp-content/uploads/2023/standalone/index.html ```
- standalone/visualizer.html to ``` public_html/wp-content/uploads/2023/standalone/visualizer.html ```
