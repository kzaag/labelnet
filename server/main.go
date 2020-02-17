package main

import (
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"os"
	"os/user"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/valyala/fasthttp"
)

type Config struct {

	// security concern - not encrypted
	key []byte

	dataroot string
	jwtiss   string
	jwtmadd  uint
	user     string
	pwd      string
	url      string

	// changing group and whether this op is allowed
	grp  int
	grpc bool
}

func CVal(c *Config) error {
	if len(c.dataroot) == 0 {
		c.dataroot = "./"
	}

	if len(c.key) < 32 {
		return fmt.Errorf("key was too short. at least 32 bytes got %d\n", len(c.key))
	}

	if len(c.jwtiss) == 0 ||
		c.jwtmadd == 0 ||
		len(c.user) == 0 ||
		len(c.pwd) == 0 ||
		len(c.url) == 0 {

		return fmt.Errorf("required fields: jwtiss ( string ), jwtmadd ( uint ), user ( string ), pwd ( string ), url ( string )\n")
	}

	return nil
}

func CSet(c *Config, k string, v string) error {

	switch k {
	case "key":

		sk, err := base64.StdEncoding.DecodeString(v)
		if err != nil {
			return err
		}

		c.key = sk

	case "dataroot":
		c.dataroot = v
	case "jwtiss":
		c.jwtiss = v
	case "jwtmadd":
		v, err := strconv.Atoi(v)
		if err != nil {
			return fmt.Errorf("couldnt parse key: jwtadd to int")
		}
		c.jwtmadd = uint(v)
	case "user":
		c.user = v
	case "pwd":
		c.pwd = v
	case "url":
		c.url = v
	case "grp":
		v, err := strconv.Atoi(v)
		if err != nil {
			return fmt.Errorf("couldnt parse key: grp to int")
		}
		c.grp = v
		c.grpc = true
	default:
		// ignore not mapped keys - why bother
		return nil
	}

	return nil
}

func CRead(c *Config, name string) error {

	cb, err := ioutil.ReadFile(name)
	if err != nil {
		return err
	}

	cs := string(cb)

	lines := strings.Split(cs, "\n")

	for i := 0; i < len(lines); i++ {

		line := lines[i]

		if strings.HasPrefix(line, "#") || len(line) == 0 {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 || len(parts[0]) == 0 || len(parts[1]) == 0 {
			return fmt.Errorf("malformed config entry: %s\n", line)
		}

		if err := CSet(c, parts[0], parts[1]); err != nil {
			return err
		}
	}

	return CVal(c)

}

func newtoken(c *Config) (string, error) {

	now := time.Now()
	tk := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss": c.jwtiss,
		"exp": now.AddDate(0, int(c.jwtmadd), 0).Unix(),
	})

	tks, err := tk.SignedString(c.key)

	if err != nil {
		return "", err
	}

	return tks, nil
}

func Authorize(h *fasthttp.RequestHeader, c *Config) error {

	ts := ""

	h.VisitAll(func(key, value []byte) {

		if string(key) == "Authorization" {
			ts = string(value)
			ts = strings.TrimPrefix(ts, "Bearer ")
		}

	})

	if ts == "" {
		return fmt.Errorf("no authorization provided")
	}

	token, err := jwt.Parse(ts, func(token *jwt.Token) (interface{}, error) {

		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method")
		}

		return c.key, nil
	})

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {

		if !claims.VerifyExpiresAt(time.Now().Unix(), true) {
			return fmt.Errorf("token expired")
		}

		if !claims.VerifyIssuer(c.jwtiss, true) {
			return fmt.Errorf("invalid issuer")
		}

	} else {
		return fmt.Errorf("Invalid token")
	}

	if err != nil {
		return err
	}

	return nil
}

func Login(user, password string, c *Config) bool {

	cname := c.user
	cpwd := c.pwd

	if cname != user || cpwd != password {
		return false
	}

	return true
}

func AddCors(ctx *fasthttp.RequestCtx) {
	ctx.Response.Header.SetCanonical([]byte("Access-Control-Allow-Origin"), []byte("*"))
	ctx.Response.Header.SetCanonical([]byte("Access-Control-Allow-Headers"), []byte("x-user, x-password, Authorization, content-type"))
	ctx.Response.Header.SetCanonical([]byte("Access-Control-Allow-Methods"), []byte("POST, OPTIONS"))
}

type LBuffer struct {
	set   string
	sset  string
	label string
	llen  int
	body  []byte
}

func LBValidate(l *LBuffer) error {

	if len(l.set) == 0 ||
		len(l.sset) == 0 ||
		len(l.label) == 0 ||
		l.llen == -1 ||
		l.body == nil {

		return fmt.Errorf("field not found")
	}

	if l.llen > len(l.body) {
		return fmt.Errorf("offset was: %d which is bigger than length of data: %d", l.llen, len(l.body))
	}

	return nil
}

func SplitABody(buff []byte, offset int) ([]byte, []byte) {
	lbl := make([]byte, offset)

	img := make([]byte, len(buff)-offset)

	for i := 0; i < len(buff); i++ {
		if i < offset {
			lbl[i] = buff[i]
		} else {
			img[i-offset] = buff[i]
		}
	}

	return lbl, img
}

func Exists(path string) (bool, error) {

	if _, err := os.Lstat(path); err != nil {

		if os.IsNotExist(err) {
			return false, nil
		}

		return true, err
	}

	return true, nil

}

// used in post error recovery and cleanup - thus it should not return errors
func FExists(path string) bool {

	if _, err := os.Lstat(path); err != nil {

		return false
	}

	return true
}

func LBCleanup(apath string, jpgpath string) {

	if FExists(apath) {
		os.Remove(apath)
	}

	if FExists(jpgpath) {
		os.Remove(jpgpath)
	}

}

func AppendText(path string, text string, uid int, gid int, mode os.FileMode) error {

	var err error
	var exist bool

	exist, err = Exists(path)

	if err != nil {
		return err
	}

	var flags int = os.O_APPEND | os.O_WRONLY | os.O_CREATE

	f, err := os.OpenFile(path, flags, mode)
	if err != nil {
		return err
	}

	defer f.Close()

	if !exist {
		os.Chown(path, uid, gid)
	}

	if _, err := f.WriteString(text); err != nil {
		return err
	}

	return nil
}

func MkdirR(dirpath string, uid int, gid int, mode os.FileMode) error {

	parts := strings.Split(dirpath, "/")

	for i := 0; i < len(parts); i++ {

		fdp := ""
		if strings.HasPrefix(dirpath, "/") {
			fdp += "/"
		}

		for j := 0; j <= i; j++ {
			fdp += parts[j] + "/"
		}

		_, err := os.Stat(fdp)

		if err == nil {
			continue
		}

		if !os.IsNotExist(err) {
			return err
		}

		if err := os.Mkdir(fdp, mode); err != nil {
			return err
		}

		if err := os.Chown(fdp, uid, gid); err != nil {
			return err
		}
	}

	return nil
}

func Uid() (int, error) {

	user, err := user.Current()
	if err != nil {
		return -1, err
	}

	uid, err := strconv.Atoi(user.Uid)

	if err != nil {
		return -1, err
	}

	return uid, nil
}

func Gid() (int, error) {

	user, err := user.Current()
	if err != nil {
		return -1, err
	}

	gid, err := strconv.Atoi(user.Gid)

	if err != nil {
		return -1, err
	}

	return gid, nil
}

// mkdir with mode parents and recursively
// using given api config
func Mkdatadir(path string, uid int, gid int, m os.FileMode) error {
	var e bool
	var err error

	if e, err = Exists(path); err != nil {
		return err
	}

	if !e {
		err = MkdirR(path, uid, gid, m)
	}

	return err
}

func Mkdatafile(path string, content []byte, uid int, gid int, mode os.FileMode) error {

	var e bool
	var err error

	e, err = Exists(path)

	if err != nil {
		return err
	}

	if e {
		return fmt.Errorf("data file already exists")
	}

	err = ioutil.WriteFile(path, content, mode)

	if err != nil {
		return err
	}

	return os.Chown(path, uid, gid)
}

func LBSave(lb *LBuffer, c *Config) error {

	l, i := SplitABody(lb.body, lb.llen)

	apath := path.Join(c.dataroot, lb.set, lb.sset, "annotations")
	jpath := path.Join(c.dataroot, lb.set, lb.sset, "jpegimages")
	spath := path.Join(c.dataroot, lb.set, lb.sset, "imagesets")

	var gid int
	var uid int
	var err error

	if uid, err = Uid(); err != nil {
		return err
	}

	if c.grpc {
		gid = c.grp
	} else {
		gid, err = Gid()
	}

	if err != nil {
		return err
	}

	var mode os.FileMode

	if c.grpc {
		mode = 0750
	} else {
		mode = 0740
	}

	if err = Mkdatadir(apath, uid, gid, mode); err != nil {
		return err
	}

	if err = Mkdatadir(jpath, uid, gid, mode); err != nil {
		return err
	}

	if err = Mkdatadir(spath, uid, gid, mode); err != nil {
		return err
	}

	if c.grpc {
		mode = 0440
	} else {
		mode = 0400
	}

	jfpath := path.Join(jpath, lb.label+".jpg")
	afpath := path.Join(apath, lb.label+".xml")

	if err = Mkdatafile(jfpath, i, uid, gid, mode); err != nil {
		LBCleanup(afpath, jfpath)
		return err
	}

	if err = Mkdatafile(afpath, l, uid, gid, mode); err != nil {
		LBCleanup(afpath, jfpath)
		return err
	}

	if c.grpc {
		mode = 0660
	} else {
		mode = 0640
	}

	tfpath := path.Join(spath, "trainval.txt")

	if err := AppendText(tfpath, lb.label+"\n", uid, gid, mode); err != nil {
		LBCleanup(afpath, jfpath)
		return err
	}

	return nil
}

func HandleLogin(ctx *fasthttp.RequestCtx, c *Config) {

	uname := ""
	upwd := ""

	ctx.Request.Header.VisitAll(func(key, value []byte) {

		if strings.ToLower(string(key)) == "x-user" {
			uname = string(value)
		}

		if strings.ToLower(string(key)) == "x-password" {
			upwd = string(value)
		}
	})

	if !Login(uname, upwd, c) {

		ctx.SetStatusCode(401)

	} else {

		if t, err := newtoken(c); err != nil {
			ctx.SetStatusCode(500)

		} else {

			ctx.WriteString(t)
			ctx.SetStatusCode(200)

		}

	}
}

func HandleValidate(ctx *fasthttp.RequestCtx, c *Config) {

	if err := Authorize(&ctx.Request.Header, c); err != nil {

		ctx.WriteString(err.Error())
		ctx.SetStatusCode(401)

	} else {

		ctx.SetStatusCode(204)

	}
}

func HandleImg(ctx *fasthttp.RequestCtx, c *Config) {

	if err := Authorize(&ctx.Request.Header, c); err != nil {

		ctx.WriteString(err.Error())
		ctx.SetStatusCode(401)

	} else {

		lbody := LBuffer{"", "", "", -1, nil}

		ctx.Request.URI().QueryArgs().VisitAll(func(k, v []byte) {

			switch strings.ToLower(string(k)) {
			case "s":
				lbody.set = string(v)
			case "ss":
				lbody.sset = string(v)
			case "n":
				lbody.label = string(v)
			case "ll":
				v, err := strconv.Atoi(string(v))
				if err == nil {
					lbody.llen = v
				}
			}

		})

		lbody.body = ctx.Request.Body()

		if err := LBValidate(&lbody); err != nil {

			ctx.WriteString(err.Error())
			ctx.SetStatusCode(400)

		} else if err := LBSave(&lbody, c); err != nil {

			ctx.WriteString(err.Error())
			ctx.SetStatusCode(500)

		}

	}
}

func main() {

	config := Config{}

	if err := CRead(&config, "main.conf"); err != nil {
		fmt.Printf(err.Error())
		os.Exit(1)
	}

	s := fasthttp.Server{}
	s.MaxRequestBodySize = 50000000

	s.Handler = func(ctx *fasthttp.RequestCtx) {

		if ctx.IsOptions() {
			AddCors(ctx)
			ctx.SetStatusCode(200)
			return
		}

		switch string(ctx.Path()) {
		case "/l":

			HandleLogin(ctx, &config)

		case "/v":

			HandleValidate(ctx, &config)

		case "/i":

			HandleImg(ctx, &config)

		default:
			ctx.SetStatusCode(404)
		}

		AddCors(ctx)
	}

	err := s.ListenAndServe(config.url)

	if err != nil {
		fmt.Printf(err.Error())
		os.Exit(1)
	}

}
