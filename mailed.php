<?php
// the message

$msg = $_POST["msg"];
$to = $_POST["to"];
$subject = $_POST["subject"];

// Always set content-type when sending HTML email
$headers = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";

// More headers
$headers .= 'From: <SRQ.Loteria@srq.com.ve>' . "\r\n";

// use wordwrap() if lines are longer than 70 characters
$msg = wordwrap($msg,70);

// send email
echo mail($to,$subject,$msg,$headers);
?>