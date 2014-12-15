<?php

require get_include_path() . '/../vendor/autoload.php';

?>
<!DOCTYPE html>
<html lang="en">
<head>
<link rel="stylesheet" href="css/main.css">
</head>
<body>

<h2>Kint debugging package loaded via Composer</h2>

<?php

d($_SERVER);

?>
</body>
</html>
