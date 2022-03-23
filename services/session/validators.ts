// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Validall } from "@pestras/validall";

new Validall('login', {
  email: { $type: 'string', $is: 'email', $required: true, $message: 'invalidEmail' },
  password: { $type: 'string', $required: true, $message: 'passwordRequired' }
});

new Validall('forgotPassword', {
  email: { $type: 'string', $is: 'email', $required: true, $message: 'invalidEmail' }
});

new Validall('resetPassword', {
  password: { $type: 'string', $required: true, $message: 'passwordRequired' }
});

new Validall('changePassword', {
  newPassword: { $type: 'string', $required: true, $message: 'passwordRequired' },
  oldPassword: { $type: 'string', $required: true, $message: 'passwordRequired' }
});