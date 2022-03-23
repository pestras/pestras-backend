// Copyright (c) 2022 Pestras
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Validall } from "@pestras/validall";

new Validall("createMember", {
  email: { $type: 'string', $is: 'email', $required: true, $message: 'invalidEmail' },
  orgunit: { $type: 'string', $default: '', $message: 'invalidOrgunitId' },
  role: { $type: 'number', $inRange: [0, 4], $required: true, $message: 'invalidRole' },
  profile: {
    $message: "profileRequired",
    $props: {
      fname: { $type: "string", $required: true, $message: "firstnNameRequired" },
      mname: { $type: "string", $default: "" },
      lname: { $type: "string", $required: true, $message: "lastNameRequired" },
      title: { $type: "number", $inRange: [0, 2], $default: 0 },
      mobile: { $type: "string", $is: 'number', $default: "" },
      birthDate: { $type: "string", $nullable: true }
    }
  }
});

new Validall("updateProfile", {
  fname: { $type: "string", $required: true, $message: "invalidFirstnName" },
  mname: { $type: "string", $default: "" },
  lname: { $type: "string", $required: true, $message: "invalidLastnName" },
  title: { $type: "number", $inRange: [0, 2], $message: "invalidTitle" },
  mobile: { $type: "string", $is: 'number', $message: "invalidMobile" },
  birthDate: { $type: "string", $nullable: true, $message: "invalidbirthDate" }
});