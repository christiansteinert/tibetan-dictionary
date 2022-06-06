# Python application for providing the rough page number in scanned Tibetan documents
## Introduction
This is a small application that providese the approximate page number of a Tibetan word in a scanned document. 

The program is written with the Flask framework and provides a REST endpoint that can be queried to ask where in a Tibetan document a term should occur according to the usual ordering scheme in modern Tibetan dictionaries.

The program works by using a list of head words which contains the fist word on each page. The expected page number of all other terms is interpolated by checking where a queried term fits alphabetically between the known head words.

This strikes a good balance between giving relatively quick access to printed dictionaries without having to index the page number of every single word in the dictionary.

## Huge thanks
Huge thanks go to Octave Boczkowski who came up with this wonderful idea. Furthermore, he meticulously indexed the head words of the dictionaries by Jäschke and Chandra Das and created a [python implementation](https://github.com/julkamny/tibetan_jottings/) that was then converted into this little Flask application.

## Configuration
The configuration resides in the data/ subdirectory. It contains a JSON file that lists the known dictionaries. For each JSON file there needs to be a .txt file in a special format that lists the head word for each page.

More information about the format of these .txt files is contained at the beginning of these files themselves.

## Running this application 
### Testing
For testing purposes the application can be run by installing the python packages that are imported at the beginning of the code and then executing `python app.py`.

This will start a local test server at port 5000. 

The page information can then be queried by sending a GET request to `http://localhost:5000/<dictionary-name>/<tibetan-term-in-wylie-transliteration>` - for example `http://localhost:5000/jaeschke/ka` or `http://localhost:5000/das/sangs rgyas`.


### Production 
For running this application in production the recommended way is to use a web server with support for the python WSGI (Web Service Gateway Interface). 

One possibility is to use Apache and install mod_wsgi.

With mod_wsgi installed it is then enough to add the following line to your web site configuration `WSGIScriptAlias /<virtualPath> /<path-to-script>/app.py`.

## Relationship to the overall dictionary application
This python endpoint is called by the overall dictionary application to determine the page number of a term that is queried by a user. The overall dictionary application will then load the images for the corresponding pages from a separate path and display them within the overall dictionary application.
