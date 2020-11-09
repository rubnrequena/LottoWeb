<?php	
	require('../redir.php');
	setcookie("taquilla",$port["taquilla"]);
	date_default_timezone_set('America/Caracas');
    $file = "index.html";
    $data = file_get_contents($file);
    $data = str_replace('@version',filemtime($file),$data);
    $data = str_replace('@verStamp',date('ymd',filemtime($file)),$data);
    
    /*
    $json = file_get_contents('http://216.128.130.103:3333/4012');
    $tunel = json_decode($json);
    $tunel = substr($tunel->url,8);
    */
    
    $data = str_replace('@rutaAlt','',$data);
    echo $data;
?>
