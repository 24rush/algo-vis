# Start web server #
``` npx webpack serve --live-reload ```

# Start chrome to allow SAB #
``` chrome.exe --enable-features=SharedArrayBuffer --user-data-dir="D:\temp" ```

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
``` python scripts/snippets_generator.py -i wordpress/snippets```
Output json will be in folder pointed by ```-i```

### HTML ###
- use ```av-quiz``` class on button to launch the quiz