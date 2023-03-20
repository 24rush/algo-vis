# Start web server #
``` npx webpack serve --live-reload ```

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

### Run generator from project root ###
``` npm run gen-snippets ```
Output json will be in folder pointed by ```-i```

### HTML ###
- use ```av-quiz``` class on button to launch the quiz

# Snippet files and standalone editor deployment#
- .json snippet files to ``` public_html/wp-content/uploads/2023/snips ```
- standalone/index.html to ``` public_html/wp-content/uploads/2023/standalone/index.html ```