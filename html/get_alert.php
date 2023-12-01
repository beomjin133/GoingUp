<?php 

    header("Content-Type: application/json; charset=utf-8");

    $data =file_get_contents('php://input');

    $command = "python3 /home/ec2-user/System-Trading/trading/read_alert.py ". escapeshellarg($data);
    exec($command, $output, $return_var);
    $json_array = json_encode($output);
    echo $json_array

?>