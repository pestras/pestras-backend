// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Validall } from "@pestras/validall";

new Validall('changeEmail', {
  email: { $type: 'string', $is: 'email', $required: true, $message: 'invalidEmail' }
});

new Validall('changeMemberEmail', {
  email: { $type: 'string', $is: 'email', $required: true, $message: 'invalidEmail' }
});

new Validall('resendVerificationEmail', {
  email: { $type: 'string', $is: 'email', $required: true, $message: 'invalidEmail' },
  password: { $type: 'string', $required: true, $message: 'passwordRequired' }
});