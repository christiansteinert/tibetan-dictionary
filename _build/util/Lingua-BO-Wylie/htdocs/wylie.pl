#!/usr/bin/perl

use strict;
use lib '/srv/www/perl-lib';
use Lingua::BO::Wylie;
use Encode ();

use CGI ();
$CGI::POST_MAX = 1024 * 1024;	# max 1MB posts
$CGI::DISABLE_UPLOADS = 1;  	# no uploads

binmode(STDOUT, ":utf8");

my $conv = CGI::param('conversion') || "wy2uni";

my $input = CGI::param("input");
$input = '' unless defined $input;
$input = Encode::decode_utf8($input);

my $show = $input;
if ($show eq '' && $conv eq 'wy2uni') {
  $show = "oM aHhU~M` badzra gu ru pad+ma sid+dhi hU~M`:";
}

# perl-generate the selects so we can keep the values on page reload
my %selects = (
  tib_font	=> [
  	"Tibetan Machine Uni",
	"Jomolhari",
	"Microsoft Himalaya",
	"Uchen_05",
	"Wangdi29",
	"Xenotype Tibetan New",
	"XTashi",
	"Code2000",
	"SimSun-18030",
  ],
  tib_size	=> [
	"18px",
	"20px",
	"24px",
	"28px",
	"32px",
	"36px",
	"40px",
	"44px",
	"48px",
	"52px",
  ],
  conversion	=> [
  	[ "wy2uni",	"Wylie to Unicode" ],
	[ "uni2wy", 	"Unicode to Wylie" ],
  ],
);

unless (CGI::param('tib_size')) {
  CGI::param(tib_size => "28px");
}

sub make_options {
  my $name = shift;
  my @out;
  my $opts = $selects{$name};
  foreach my $opt (@$opts) {
    my ($value, $label);
    if (ref($opt)) {
      ($value, $label) = @$opt;
    } else {
      $value = $label = $opt;
    }
    my $sel = ((CGI::param($name) || '') eq $value) ? 'selected' : '';
    push @out, qq{<option $sel value="$value">$label</option>\n};
  }
  return join '', @out;
}

my %html_options = map { $_ => make_options($_) } keys %selects;

$input =~ s/(?:\r|\n)*$//;

my $wl = new Lingua::BO::Wylie(
  check_strict => 1,
  print_warnings => 0
);

my $out = '';
my $warns;

if ($input ne '') {
  $out = $conv eq 'wy2uni' ? $wl->from_wylie($input) : $wl->to_wylie($input);
  $warns = $wl->get_warnings();
}

# plain text output?
if (CGI::param('plain')) {
  print CGI::header(-charset => "utf-8", -type => "text/plain");
  print $out;
  if ($warns && @$warns) {
    print "\n\n---\n";
    foreach my $w (@$warns) {
      print "$w\n";
    }
  }
  exit 0;
}

# HTML output
print CGI::header(-charset => "utf-8");
start_html();

sub start_html {
  print <<_HTML_;
<html>
<head>
<style>
  body { background: #fff; margin-left: 15px; }
  body, td, input, select, textarea { font-family:verdana, tahoma, helvetica; font-size: 12px; }
  .tib { font-family: "Tibetan Machine Uni"; font-size: 28px; }
  .warn { font-family: tahoma; font-size: 12px; }
  .eng { font-family: tahoma; font-size: 14px; }
  .after { font-size: 10px; }
  .title { font-size: 16px; font-weight: bold; }
  textarea#id__txt { margin-top: 5px; margin-bottom: 5px; padding: 5px; border: 1px solid blue; height: 120px; width: 85%; font-family: fixed; font-size: 14px; }
</style>
<title>Tibetan transliteration: convert between Wylie and Unicode</title>
</head>
<body>
<form id="id__form" method="POST">
<span class="title">Tibetan transliteration: convert between Wylie and Unicode</span><br><br>

<div style="width: 80%">
<table width="100%" cellspacing="0" cellpadding="0"><tr>
<td width="60%" align="left" style="white-space: nowrap;">
Paste your Tibetan text below, and click "Convert" or press Ctrl+Enter.
</td>
<td width="40%" align="center" style="white-space: nowrap;">
Tibetan Font:
<select name="tib_font" id="id__tib_font" onchange="javascript:set_tib_font();">
$html_options{tib_font}
</select>
<select name="tib_size" id="id__tib_size" onchange="javascript:set_tib_font();">
$html_options{tib_size}
</select>
</td>
</tr></table></div>

<textarea id="id__txt" style="font-size: 14px;" onkeydown="return textarea_keydown(event);" name="input">$show</textarea><br>
<div style="width: 80%">
<table width="100%" cellspacing="0" cellpadding="0"><tr>
<td width="40%" align="left" style="white-space: nowrap;">
<select id="id__conversion" name="conversion" onchange="javascript:set_tib_font();">
$html_options{conversion}
</select>
<input type="submit" name="send" value="Convert!">
</td>
</tr></table>
</div>
</form>
<br>

_HTML_
}

if ($out ne '') {
  $out = CGI::escapeHTML($out);

  if ($conv eq 'wy2uni') {
    print <<_HTML_;
Converted text in Tibetan script:<br>
<textarea id="id__tib_out" style="border: 1px solid #888; background: #eef; padding: 8px; width: 85%; height: 250px;" class="tib">$out</textarea>
<div class="after">
If the text does not render properly, you might need to upgrade your brower and/or install the <a href="http://www.thdl.org/tools/toolbox/index.php?pg=26a34146-33a6-48ce-001e-f16ce7908a6a/tibetan^fonts.html#wiki=/wiki/site/26a34146-33a6-48ce-001e-f16ce7908a6a/tibetan%20machine%20uni.html">Tibetan Machine Uni</a> font.
</div>
_HTML_
  } else {
    print <<_HTML_;
Converted text in Wylie transliteration:<br>
<textarea style="border: 1px solid #888; background: #eef; padding: 8px; width: 85%; height: 250px;" class="eng">$out</textarea><br>
_HTML_
  }
}

if ($warns && @$warns) {
  $warns = join "<br>\n", map { CGI::escapeHTML($_) } @$warns;
  print <<_HTML_;
<br>
Warnings:
<div style="border: 1px solid #888; background: #ff8; padding: 8px; width: 85%" class="warn">
$warns
</div>
_HTML_
}

finish();

sub finish {
  print <<_HTML_;
<div class="after">
<br><br>
&bull; This conversion code is Free Software; you can <a href="/tibetan/Lingua-BO-Wylie-dev.zip">download the Perl module here</a>.

<br>
&bull; See the definition of <a target="_blank" href="http://www.thlib.org/reference/transliteration/#essay=/thl/ewts/ ">THL Extended Wylie Transliteration Schema</a>

</div>
<br><br>
<script language="javascript">
function textarea_keydown(e) {
  // submit on control-Enter
  if (e && e.keyCode == 13 && e.ctrlKey) {
    document.getElementById('id__form').submit();
    return false;
  }
  return true;
}

function set_tib_font() {
  // read some drop-downs
  var e = document.getElementById('id__tib_font');
  var ft = e.options[e.selectedIndex].value;
  e = document.getElementById('id__tib_size');
  var fs = e.options[e.selectedIndex].value;
  e = document.getElementById('id__conversion');
  var conv = e.options[e.selectedIndex].value;

  e = document.getElementById('id__tib_out');
  if (e) {
    e.style.fontFamily = ft;
    e.style.fontSize = fs;
  }

  e = document.getElementById('id__txt');
  if (conv == 'wy2uni') {
    e.style.fontFamily = "verdana, tahoma, helvetica";
    e.style.fontSize = "14px"
  } else {
    e.style.fontFamily = ft;
    e.style.fontSize = fs;
  }
}

document.getElementById('id__txt').select();
document.getElementById('id__txt').focus();
set_tib_font();

</script>

</body>
</html>
_HTML_
}

