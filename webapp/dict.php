<?php
  
  if(file_exists('TibetanDictionary_private.db'))
    $db = new SQLite3('TibetanDictionary_private.db');
  else
    $db = new SQLite3('TibetanDictionary.db');
  
  $expire = 'Expires: ' . gmdate('D, d M Y H:i:s', strtotime('+1 hours')) . ' GMT';
  header($expire);

  if(isset($_POST['dictionaries']) && sizeof($_POST['dictionaries'])>0) {
    $dictionaries = $_POST['dictionaries'];
    $dictQuery = '';
    foreach ($dictionaries as $dict) {
      if($dictQuery != '') {
        $dictQuery .= ' OR ';
      }
      $dictQuery .= ' dictionary="'.$db->escapeString($dict).'"';
    }
  } else {
    $dictQuery = 'false';
  }
  
  $lang = trim($_POST['lang']);
  if($lang == "en") {
    $table = "DICT_EN";
  } else {
    $table = "DICT";
  }
  
  if(isset($_POST['term'])) { // search for the definition of a term
    header("Content-type: application/json");

    $term = trim($_POST['term']);
    $prevTerm = '';
    print('{');
    $statement = $db->prepare('SELECT * FROM '.$table.' WHERE ( term=:term ) AND ( '.$dictQuery.' ) ORDER BY dictionary;');
    $statement->bindValue(':term', $term, SQLITE3_TEXT);
    $results = $statement->execute();
    
    if($results == FALSE) {
      die( $db->lastErrorMsg() );
    }
    
    $prevDict = '';
    $entriesFound = false;
    while ($row = $results->fetchArray()) {
      $definition = str_replace( '"', '\\"', $row['definition'] );
      if( $prevDict == $row['dictionary'] && $prevTerm == $row['term'] ) {
        print('\\n' . $definition);
      } else {
        if( $prevDict != '' ) {
          print('",');
        }
        print('"' . $row['dictionary'] . '":"' . $definition);
      }
      $prevDict = $row['dictionary'];
      $prevTerm = $row['term'];
      $entriesFound = true;
    }
    
    if($entriesFound == true) {
      print('"');
    }
    print('}');
    
  } else if(isset($_POST['search'])) { //search for the list of results that start with a given syllable / syllable combination
    header("Content-type: application/json");
    
    $search = trim($_POST['search']);
    $maxresults = preg_replace('[^0-9]','',$_POST['maxresults']);
    if($maxresults > 500) {
      $maxresults = 500;
    }
    $offset = preg_replace('[^0-9]','',$_POST['offset']); 
    if($lang == 'tib') {
        $statement = $db->prepare('SELECT DISTINCT term FROM '.$table.' WHERE ((( term = :word ) OR ( term > :wordSearch1 AND term < :wordSearch2 )) AND ('.$dictQuery.')) GROUP BY term ORDER BY rowid LIMIT '.$maxresults.' OFFSET '.$offset.';');
        $statement->bindValue(':word', $search, SQLITE3_TEXT);
        $statement->bindValue(':wordSearch1',  $search . ' ', SQLITE3_TEXT);
        $statement->bindValue(':wordSearch2', $search . ' zzzzz', SQLITE3_TEXT);
        $statement->bindValue(':dictionaries', $dictionaries);    
    } else {
        $statement = $db->prepare('SELECT DISTINCT term FROM '.$table.' WHERE ((( term = :word ) OR ( term like :wordSearch )) AND ('.$dictQuery.')) GROUP BY term ORDER BY rowid LIMIT '.$maxresults.' OFFSET '.$offset.';');
        $statement->bindValue(':word', $search, SQLITE3_TEXT);
        $statement->bindValue(':wordSearch',  $search . '%', SQLITE3_TEXT);
        $statement->bindValue(':dictionaries', $dictionaries);    
    }

    $results = $statement->execute();
    $firstRow = true;
    
    if($results == FALSE) {
      die( $db->lastErrorMsg() );
    }
    
    print('[');
    while ($row = $results->fetchArray()) {
      if(!$firstRow) {
        print(',');
      }
      print('["' . $row['term'] . '"]');
      $firstRow = false;
    }
    print(']');
    
  } else if(isset($_POST['checkTerms'])) { //check, if a term or set of terms exists
    header("Content-type: application/json");
    $termInfo = $_POST['checkTerms'];
    $result = array();
    foreach ($termInfo as $sectionId => $sectionInfo) {
      $term = $sectionInfo['wylie'];
      $statement = $db->prepare('SELECT term FROM '.$table.' WHERE term=:word LIMIT 1;');
      $statement->bindValue(':word', $term, SQLITE3_TEXT);
      $results = $statement->execute();
      $found = false;
      
      if($results == FALSE) {
        die( $db->lastErrorMsg() );
      }
      
      while ($row = $results->fetchArray()) {
        $found = true;
      }
      
      if($found) {
        $result[$sectionId] = $sectionInfo;
      }
    }
    print(json_encode($result));
  }
  $db->close();
  
?>
