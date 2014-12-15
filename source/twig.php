<?php

require get_include_path() . '/../vendor/autoload.php';

Twig_Autoloader::register();
$loader = new Twig_Loader_Filesystem(realpath(get_include_path() . '/templates/'));
$twig = new Twig_Environment($loader);

echo $twig->render('base.twig', ['body' => 'This is insane.']);
