# Field

The form-row wrapper: label (+ optional/hint affixes) and help or error text around a control. This is the default composition unit for every Dashboardy form.

```jsx
<Field label="Warehouse"><Input name="warehouse" placeholder="COMPUTE_WH" /></Field>
<Field label="Schema" optional><Input name="schema" placeholder="PUBLIC" /></Field>
<Field label="PEM passphrase" hint="(if encrypted)"><Input type="password" /></Field>
<Field label="Account" error="Duplicate connection name"><Input invalid /></Field>
```

Props: `label`, `htmlFor` (explicit association), `optional`, `hint`, `help`, `error`. Pass the control as children.
