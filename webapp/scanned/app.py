import os
import re
import json
from collections import namedtuple

# 3rd party dependencies:
from pyewts import pyewts
from tibetan_sort.tibetan_sort import TibetanSort
from flask import Flask

app = Flask(__name__)
sorter = None
dictionaries = []

def init():
    global dictionaries, sorter

    if sorter is None:
        sorter = TibetanSort()

    if not len(dictionaries):
        dictionaries = load_dictionaries()

def get_own_path():
    return os.path.dirname(__file__)

def load_dictionaries():
    try:
        with open(f'{get_own_path()}/data/dicts.json', encoding="utf-8") as dict_definitions:
            dicts = json.load(dict_definitions)
            
        for dict in dicts:
            file_path = f'{get_own_path()}/data/{dict["id"]}_headers.txt'
            print(f'loading {file_path}')
            dict['headers'] = load_head_words(file_path)

        return dicts
    except Exception as e:
        print(e)

def remove_wasur(tib_string):
    return tib_string.replace(chr(0x0fad),'')

def find_closest_header_page(query, headers):
    '''
    Find matching page for a term
    '''
    if not query.endswith('་'):
        query += '་'

    head_words = [x.word for x in headers]
    if query in head_words:
        # the word we search for is directly contained in our list
        # of headwords
        term_idx = head_words.index(query)
        return int(headers[term_idx].page)
    else:
        # The word we search is not contained in the list of headwords.
        # Return the page number of the head-word that comes alphabetically
        # right before the term we search
        nearest_idx = sorter.sort_list(head_words + [query]).index(query)
        return int(headers[nearest_idx - 1].page) 

def load_head_words(file):
    HeadWordPosition = namedtuple('HeadWordPosition', 'word page')
    headers = []
    with open(file, 'r', encoding="utf-8") as file:
        lines = file.readlines()
        for line in lines:
            if not re.match('^(#|\t|\s)', line):
                query = re.search(r'(\d+)\.\s([^-(–]+)', line.rstrip())
                page, tibText = query.group(1), remove_wasur(query.group(2).rstrip())
                word = HeadWordPosition(tibText, page)
                headers.append(word)
    return headers
        
def get_dict(dict_id):
    return next(dict for dict in dictionaries if dict['id'] == dict_id)

@app.route('/<dict_id>/<query>')
def find_dict_page(dict_id, query):
    try:
        init()
        dict_id = re.sub('[^a-z]', '', dict_id) # sanitize input
        query = re.sub(r"[^\.\-'a-zA-Z+ ]", '', query) # sanitize input
        query = re.sub(r"\s*$", ' ', query) # add tseg at the end
        
        dict = get_dict(dict_id)
        
        if dict is not None:
            query = pyewts().toUnicode(query)
            query = remove_wasur(query)
            page_nr_nominal  = find_closest_header_page(query, dict['headers'])
            page_nr_adjusted = page_nr_nominal + dict['offset']

            return { 
                'term_page_nominal': page_nr_nominal, 
                'term_page': page_nr_adjusted, 
                'min_page': dict['min_page'], 
                'max_page': dict['max_page'],
                'width': dict['width'],
                'height': dict['height']
            }
    
    except Exception as e:
        print(e)
    
    return {'error': 'bad_request'}


if __name__ == '__main__':
    app.run()
    
    
application = app
