'use strict';
//mongodb user model
const { OAuth2Client } = require('google-auth-library');
const Verify = require('../provider/verifyEmail');
const User = require('../../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { basickResponse } = require('../../config/response');
const { resultResponse } = require('../../config/response');
require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY;
const saltRounds = 10;

let nameRegex = /^[가-힣a-zA-Z0-9]{2,8}/i;
let emailRegex = /^[\w\.]+@[\w](\.?[\w])*\.[a-z]{2,3}$/i;
let passwordRegex = /^(?=.*[a-z])(?=.*\d)(?=.*\W).{8,16}$/i;
let accessTokenOptions = { expiresIn: '14d', subject: 'userInfo' };

const account = {
  signUp: async (req, res) => {
    let { name, email, password } = req.body;
    name = name.trim();
    email = email.trim();
    password = password.trim();

    if (name == '' || email == '' || password == '') res.json(basickResponse('빈 문자열입니다.'));
    else if (!nameRegex.test(name))
      res.json(basickResponse('영어, 한글, 숫자만 허용하며, 2자 이상 8자 이내여야 합니다.'));
    else if (!emailRegex.test(email)) res.json(basickResponse('올바르지 않은 양식입니다.'));
    else if (!passwordRegex.test(password))
      res.json(basickResponse('영어, 숫자, 특수문자 혼용 8자 이상이어야 합니다.'));
    else {
      // 이미 가입된 user인지 확인
      User.find({ email })
        .then((result) => {
          //이미 가입된 user가 있음.
          if (result.length) res.json(basickResponse('이미 가입된 사용자입니다.'));
          else {
            // user 생성
            // password handling
            bcrypt
              .hash(password, saltRounds)
              .then((hashedPassword) => {
                const newUser = new User({
                  name,
                  email,
                  password: hashedPassword,
                });
                newUser
                  .save()
                  .then((result) =>
                    res.json(resultResponse('회원가입이 성공적으로 완료되었습니다.', true, { data: result })),
                  )
                  .catch((err) => res.json(basickResponse('회원가입 중 에러가 발생하였습니다.')));
              })
              .catch((err) => res.json(basickResponse('비밀번호 해시 과정에서 에러가 발생하였습니다.')));
          }
        })
        .catch((err) => {
          console.log(err);
          res.json(basickResponse('로그인 중 에러가 발생하였습니다.'));
        });
    }
  },

  signIn: async (req, res) => {
    let { email, password } = req.body;
    email = email.trim();
    password = password.trim();

    if (email == '' || password == '') res.json(basickResponse('빈 문자열입니다.'));
    else {
      User.find({ email })
        .then((data) => {
          if (data.length) {
            // 가입된 사용자
            const accessToken = jwt.sign(
              {
                _id: data[0]._id,
                name: data[0].name,
                email: data[0].email,
              },
              SECRET_KEY,
              accessTokenOptions,
            );
            const hashedPassword = data[0].password;
            bcrypt
              .compare(password, hashedPassword)
              .then((result) => {
                // 비밀번호 일치
                result
                  ? res.json(resultResponse('로그인에 성공했습니다.', true, { accessToken: accessToken }))
                  : res.json(basickResponse('올바르지 않은 비밀번호입니다.'));
              })
              .catch((err) => res.json(basickResponse('비밀번호 확인 중 에러가 발생하였습니다.')));
          } else res.json(basickResponse('가입하지 않은 사용자입니다.'));
        })
        .catch((err) => res.json(basickResponse('사용자가 존재하는지 확인 중 에러가 발생하였습니다.')));
    }
  },

  resetPwd: async (req, res) => {
    let { email, password } = req.body;
    email = email.trim();
    password = password.trim();
    if (!email || !password) {
      res.json(basickResponse())();
    } else {
      User.find({ email })
        .then((data) => {
          if (data.length)
            bcrypt
              .hash(password, saltRounds)
              .then((hashedPassword) =>
                User.updateOne({ email: data[0].email }, { $set: { password: hashedPassword } }).then((element) =>
                  res.json(basickResponse('성공적으로 변경이 완료되었습니다.', true)),
                ),
              );
          else res.json(basickResponse('존재하지 않는 사용자입니다.'));
        })
        .catch((err) => res.json(basickResponse('사용자가 존재하는지 확인 중 에러가 발생하였습니다.')));
    }
  },

  verifyCode: async (req, res) => {
    let { email, verifyCode } = req.body;
    email = email.trim();
    verifyCode = verifyCode.trim();
    if (!email) res.json(basickResponse())();
    else {
      User.find({ email }).then((data) => {
        if (data.length) {
          verifyCode === data[0].password.slice(-4)
            ? res.json(basickResponse('인증 통과.', true))
            : res.json(basickResponse('인증코드가 맞지 않습니다.'));
        } else res.json(basickResponse('존재하지 않는 사용자입니다.'));
      });
    }
  },

  googleSignIn: async (req, res) => {
    let { idToken } = req.body;
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    let { email, given_name } = ticket.getPayload();

    User.find({ email, type: 1 }).then((data) => {
      if (data.length) {
        const accessToken = jwt.sign(
          {
            _id: data[0]._id,
            name: data[0].name,
            email: data[0].email,
          },
          SECRET_KEY,
          accessTokenOptions,
        );
        res.json(resultResponse('로그인에 성공했습니다.', true, { accessToken: accessToken }));
      } else {
        const newUser = new User({
          name: given_name,
          email,
          type: 1,
        });
        newUser.save().then((result) => {
          User.find({ email, type: 1 }).then((data) => {
            const accessToken = jwt.sign(
              {
                _id: data[0]._id,
                name: data[0].name,
                email: data[0].email,
              },
              SECRET_KEY,
              accessTokenOptions,
            );
            res.json(resultResponse('회원가입 및 로그인에 성공했습니다.', true, { accessToken: accessToken }));
          });
        });
      }
    });
  },

  checkEmail: async (req, res) => {
    let { email } = req.body;
    email = email.trim();
    if (email === '') res.json(basickResponse('빈 문자열입니다.'));
    else if (!emailRegex.test(email)) res.json(basickResponse('올바르지 않은 양식입니다.'));
    else {
      User.find({ email })
        .then((data) => {
          data.length
            ? res.json(basickResponse('이미 가입된 이메일입니다.'))
            : res.json(basickResponse('사용가능한 이메일입니다.', true));
        })
        .catch((err) => {});
    }
  },

  checkName: async (req, res) => {
    let { name } = req.body;
    name = name.trim();
    if (name === '') res.json(basickResponse())();
    else if (!nameRegex.test(name)) res.json(basickResponse('올바르지 않은 양식입니다.'));
    else {
      User.find({ name })
        .then((data) =>
          data.length
            ? res.json(basickResponse('이미 사용중인 닉네임입니다.'))
            : res.json(basickResponse('사용가능한 닉네임입니다.', true)),
        )
        .catch((err) => {});
    }
  },

  sendEmail: async (req, res) => {
    let { email } = req.body;
    email = email.trim();
    if (email === '') res.json(basickResponse('빈 문자열입니다.'));
    else if (!emailRegex.test(email)) res.json(basickResponse('올바르지 않은 양식입니다.'));
    else {
      User.find({ email })
        .then((data) => {
          if (data.length) {
            Verify.sendGmail({
              toEmail: email,
              subject: `안녕하세요. ${data[0].name}님 민들레입니다.`,
              html: `<h1 style="color: #5e9ca0;">안녕하세요! <span style="color: #2b2301;">${
                data[0].name
              }님</span> 민들레 입니다!</h1>
              <h2 >추억을 기록하고 공유하는 소셜 네트워크 서비스 <span style="color: #5e9ca0;">민들레</span></h2>
              <p>비밀번호 변경을 위한 인증코드 입니다.<br />절대 다른 사람에게 귀하의 인증 코드를 공개하지 마십시오.</p>
              <p><h2 style="color: #2e6c80;">인증 코드</h2>
              <span style="background-color: #2b2301; color: #fff; display: inline-block; padding: 3px 10px; font-weight: bold; border-radius: 5px;">
              ${data[0].password.slice(-4)}</span> 입니다.
              </p>
              `,
            });
            res.json(basickResponse('굳', true));
          } else {
            res.json(basickResponse('없는데?'));
          }
        })
        .catch((err) => {});
    }
  },
};

module.exports = account;