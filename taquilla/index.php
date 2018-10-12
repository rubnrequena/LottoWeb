<?php	
	require('../redir.php');
	setcookie("taquilla",$port["taquilla"]);

	date_default_timezone_set('America/Caracas');
    $file = "index.html";
    $data = file_get_contents($file);
    $data = str_replace('@version',filemtime($file),$data);
    $data = str_replace('@verStamp',date('ymd',filemtime($file)),$data);
    echo $data;
?>
