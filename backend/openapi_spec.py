def get_openapi_spec():
    return {
        "openapi": "3.0.3",
        "info": {
            "title": "SEF e-Fakture API",
            "version": "1.0.0",
            "description": "OpenAPI specifikacija za autentifikaciju, korisnike, artikle i fakture.",
        },
        "servers": [
            {"url": "http://localhost:5000", "description": "Local dev"}
        ],
        "tags": [
            {"name": "Auth"},
            {"name": "Users"},
            {"name": "Products"},
            {"name": "Invoices"},
        ],
        "paths": {
            # ==================== AUTH ====================
            "/api/auth/register": {
                "post": {
                    "tags": ["Auth"],
                    "summary": "Registracija korisnika",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/RegisterRequest"},
                                "examples": {
                                    "company": {
                                        "value": {
                                            "name": "Alpha d.o.o.",
                                            "email": "alpha@company.local",
                                            "password": "alpha123",
                                            "role": "company",
                                            "pib": "100000001"
                                        }
                                    },
                                    "admin": {
                                        "value": {
                                            "name": "System Admin",
                                            "email": "admin@sef.local",
                                            "password": "admin123",
                                            "role": "admin"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "201": {"$ref": "#/components/responses/AuthUser"},
                        "400": {"$ref": "#/components/responses/BadRequest"},
                        "409": {"$ref": "#/components/responses/Conflict"},
                    }
                }
            },
            "/api/auth/login": {
                "post": {
                    "tags": ["Auth"],
                    "summary": "Prijava korisnika",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/LoginRequest"}
                            }
                        }
                    },
                    "responses": {
                        "200": {"$ref": "#/components/responses/AuthUser"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                    }
                }
            },
            "/api/auth/logout": {
                "post": {
                    "tags": ["Auth"],
                    "summary": "Odjava (briše auth cookie)",
                    "security": [{"cookieAuth": []}],
                    "responses": {
                        "200": {"$ref": "#/components/responses/Success"}
                    }
                }
            },
            "/api/auth/me": {
                "get": {
                    "tags": ["Auth"],
                    "summary": "Trenutni korisnik",
                    "security": [{"cookieAuth": []}],
                    "responses": {
                        "200": {"$ref": "#/components/responses/AuthUser"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                    }
                }
            },

            # ==================== USERS ====================
            "/api/users": {
                "get": {
                    "tags": ["Users"],
                    "summary": "Admin: lista korisnika",
                    "security": [{"cookieAuth": []}],
                    "responses": {
                        "200": {
                            "description": "OK",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "items": {
                                                "type": "array",
                                                "items": {"$ref": "#/components/schemas/User"}
                                            }
                                        },
                                        "required": ["items"]
                                    }
                                }
                            }
                        },
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                        "403": {"$ref": "#/components/responses/Forbidden"},
                    }
                }
            },
            "/api/users/{uid}/verify": {
                "patch": {
                    "tags": ["Users"],
                    "summary": "Admin: verifikuj kompaniju",
                    "security": [{"cookieAuth": []}],
                    "parameters": [
                        {"in": "path", "name": "uid", "required": True, "schema": {"type": "integer"}}
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {"verified": {"type": "boolean"}},
                                    "required": ["verified"]
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "OK",
                            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AuthUserResponse"}}}
                        },
                        "400": {"$ref": "#/components/responses/BadRequest"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                        "403": {"$ref": "#/components/responses/Forbidden"},
                        "404": {"$ref": "#/components/responses/NotFound"},
                    }
                }
            },
            "/api/users/me": {
                "get": {
                    "tags": ["Users"],
                    "summary": "Moj profil",
                    "security": [{"cookieAuth": []}],
                    "responses": {
                        "200": {"$ref": "#/components/responses/AuthUser"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                    }
                },
                "patch": {
                    "tags": ["Users"],
                    "summary": "Ažuriranje mog profila",
                    "security": [{"cookieAuth": []}],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/UpdateMeRequest"}
                            }
                        }
                    },
                    "responses": {
                        "200": {"$ref": "#/components/responses/AuthUser"},
                        "400": {"$ref": "#/components/responses/BadRequest"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                    }
                }
            },

            # ==================== PRODUCTS ====================
            "/api/products": {
                "get": {
                    "tags": ["Products"],
                    "summary": "Lista artikala",
                    "description": "Company: samo sopstveni artikli. Admin: svi ili filtrirano po owner_user_id.",
                    "security": [{"cookieAuth": []}],
                    "parameters": [
                        {"in": "query", "name": "owner_user_id", "required": False, "schema": {"type": "integer"}}
                    ],
                    "responses": {
                        "200": {
                            "description": "OK",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/Product"}}},
                                        "required": ["items"]
                                    }
                                }
                            }
                        },
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                    }
                },
                "post": {
                    "tags": ["Products"],
                    "summary": "Kreiraj artikal",
                    "security": [{"cookieAuth": []}],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CreateProductRequest"}
                            }
                        }
                    },
                    "responses": {
                        "201": {
                            "description": "Kreirano",
                            "content": {"application/json": {"schema": {"type": "object", "properties": {"product": {"$ref": "#/components/schemas/Product"}}, "required": ["product"]}}}
                        },
                        "400": {"$ref": "#/components/responses/BadRequest"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                        "403": {"$ref": "#/components/responses/Forbidden"},
                    }
                }
            },
            "/api/products/{pid}": {
                "delete": {
                    "tags": ["Products"],
                    "summary": "Obriši artikal",
                    "security": [{"cookieAuth": []}],
                    "parameters": [
                        {"in": "path", "name": "pid", "required": True, "schema": {"type": "integer"}}
                    ],
                    "responses": {
                        "200": {"$ref": "#/components/responses/Success"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                        "403": {"$ref": "#/components/responses/Forbidden"},
                        "404": {"$ref": "#/components/responses/NotFound"},
                    }
                }
            },

            # ==================== INVOICES ====================
            "/api/invoices": {
                "get": {
                    "tags": ["Invoices"],
                    "summary": "Lista faktura",
                    "security": [{"cookieAuth": []}],
                    "responses": {
                        "200": {
                            "description": "OK",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "oneOf": [
                                            {"$ref": "#/components/schemas/InvoiceListAdmin"},
                                            {"$ref": "#/components/schemas/InvoiceListCompany"}
                                        ]
                                    }
                                }
                            }
                        },
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                    }
                },
                "post": {
                    "tags": ["Invoices"],
                    "summary": "Kreiraj fakturu",
                    "security": [{"cookieAuth": []}],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CreateInvoiceRequest"}
                            }
                        }
                    },
                    "responses": {
                        "201": {"$ref": "#/components/responses/InvoiceSingle"},
                        "400": {"$ref": "#/components/responses/BadRequest"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                    }
                }
            },
            "/api/invoices/{iid}": {
                "get": {
                    "tags": ["Invoices"],
                    "summary": "Detalj fakture",
                    "security": [{"cookieAuth": []}],
                    "parameters": [
                        {"in": "path", "name": "iid", "required": True, "schema": {"type": "integer"}}
                    ],
                    "responses": {
                        "200": {"$ref": "#/components/responses/InvoiceSingle"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                        "403": {"$ref": "#/components/responses/Forbidden"},
                        "404": {"$ref": "#/components/responses/NotFound"},
                    }
                },
                "delete": {
                    "tags": ["Invoices"],
                    "summary": "Obriši fakturu",
                    "security": [{"cookieAuth": []}],
                    "parameters": [
                        {"in": "path", "name": "iid", "required": True, "schema": {"type": "integer"}}
                    ],
                    "responses": {
                        "200": {"$ref": "#/components/responses/Success"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                        "403": {"$ref": "#/components/responses/Forbidden"},
                        "404": {"$ref": "#/components/responses/NotFound"},
                    }
                }
            },
            "/api/invoices/{iid}/status": {
                "patch": {
                    "tags": ["Invoices"],
                    "summary": "Izmeni status fakture",
                    "description": "Admin bilo koju; Company samo svoje (issuer). Dozvoljeno: draft, sent, paid, cancelled.",
                    "security": [{"cookieAuth": []}],
                    "parameters": [
                        {"in": "path", "name": "iid", "required": True, "schema": {"type": "integer"}}
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {"status": {"$ref": "#/components/schemas/InvoiceStatus"}},
                                    "required": ["status"]
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"$ref": "#/components/responses/InvoiceSingle"},
                        "400": {"$ref": "#/components/responses/BadRequest"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                        "403": {"$ref": "#/components/responses/Forbidden"},
                        "404": {"$ref": "#/components/responses/NotFound"},
                    }
                }
            },
            "/api/invoices/{iid}/pdf": {
                "get": {
                    "tags": ["Invoices"],
                    "summary": "Preuzmi PDF",
                    "security": [{"cookieAuth": []}],
                    "parameters": [
                        {"in": "path", "name": "iid", "required": True, "schema": {"type": "integer"}}
                    ],
                    "responses": {
                        "200": {
                            "description": "PDF fajl",
                            "content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}
                        },
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                        "403": {"$ref": "#/components/responses/Forbidden"},
                        "404": {"$ref": "#/components/responses/NotFound"},
                    }
                }
            },
            "/api/invoices/generate-number/{recipient_pib}": {
                "get": {
                    "tags": ["Invoices"],
                    "summary": "Generiši broj fakture",
                    "security": [{"cookieAuth": []}],
                    "parameters": [
                        {"in": "path", "name": "recipient_pib", "required": True, "schema": {"type": "string", "pattern": "^\\d{9}$"}}
                    ],
                    "responses": {
                        "200": {
                            "description": "OK",
                            "content": {"application/json": {"schema": {"type": "object", "properties": {"number": {"type": "string"}}, "required": ["number"]}}}
                        },
                        "400": {"$ref": "#/components/responses/BadRequest"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                    }
                }
            },
            "/api/invoices/{iid}/send-email": {
                "post": {
                    "tags": ["Invoices"],
                    "summary": "Pošalji fakturu mejlom (sa PDF u prilogu)",
                    "security": [{"cookieAuth": []}],
                    "parameters": [
                        {"in": "path", "name": "iid", "required": True, "schema": {"type": "integer"}}
                    ],
                    "requestBody": {
                        "required": False,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {"email": {"type": "string", "format": "email"}}
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"$ref": "#/components/responses/Success"},
                        "400": {"$ref": "#/components/responses/BadRequest"},
                        "401": {"$ref": "#/components/responses/Unauthorized"},
                        "403": {"$ref": "#/components/responses/Forbidden"},
                        "404": {"$ref": "#/components/responses/NotFound"},
                        "500": {"$ref": "#/components/responses/ServerError"},
                    }
                }
            },
        },
        "components": {
            "securitySchemes": {
                "cookieAuth": {
                    "type": "apiKey",
                    "in": "cookie",
                    "name": "eg_token",
                    "description": "JWT u HttpOnly kolačiću postavljenom na login/registraciji.",
                }
            },
            "schemas": {
                # ==== Core ====
                "Role": {"type": "string", "enum": ["company", "admin"]},
                "InvoiceStatus": {"type": "string", "enum": ["draft", "sent", "cancelled", "paid"]},

                "User": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "name": {"type": "string"},
                        "email": {"type": "string", "format": "email"},
                        "pib": {"type": ["string", "null"], "example": "100000001"},
                        "role": {"$ref": "#/components/schemas/Role"},
                        "verified": {"type": "boolean"},
                        "created_at": {"type": "string", "format": "date-time"}
                    },
                    "required": ["id", "name", "email", "role", "verified", "created_at"]
                },

                "Product": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "owner_user_id": {"type": "integer"},
                        "name": {"type": "string"},
                        "code": {"type": "string"},
                        "material_type": {"type": ["string", "null"]},
                        "created_at": {"type": "string", "format": "date-time"},
                    },
                    "required": ["id", "owner_user_id", "name", "code", "created_at"]
                },

                "InvoiceItem": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "invoice_id": {"type": "integer"},
                        "product_id": {"type": "integer"},
                        "name": {"type": "string"},
                        "code": {"type": ["string", "null"]},
                        "material_type": {"type": ["string", "null"]},
                        "qty": {"type": "number"},
                        "unit_price": {"type": "number"},
                        "tax_rate": {"type": "integer", "enum": [0, 10, 20]},
                        "unit_price_with_tax": {"type": "number"},
                        "line_total": {"type": "number"},
                        "line_total_with_tax": {"type": "number"},
                    },
                    "required": ["id", "invoice_id", "product_id", "name", "qty", "unit_price", "tax_rate"]
                },

                "Invoice": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "issuer_user_id": {"type": "integer"},
                        "issuer_pib": {"type": "string"},
                        "recipient_pib": {"type": "string"},
                        "number": {"type": "string"},
                        "issue_date": {"type": "string", "format": "date"},
                        "due_date": {"type": ["string", "null"], "format": "date"},
                        "currency": {"type": "string", "enum": ["RSD", "EUR", "USD"]},
                        "total_amount": {"type": "number"},
                        "status": {"$ref": "#/components/schemas/InvoiceStatus"},
                        "items": {"type": "array", "items": {"$ref": "#/components/schemas/InvoiceItem"}},
                        "note": {"type": ["string", "null"]},
                        "created_at": {"type": "string", "format": "date-time"},
                        "updated_at": {"type": "string", "format": "date-time"},
                    },
                    "required": ["id", "issuer_user_id", "issuer_pib", "recipient_pib", "number", "issue_date", "currency", "total_amount", "status", "items", "created_at", "updated_at"]
                },

                # ==== Requests ====
                "RegisterRequest": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "email": {"type": "string", "format": "email"},
                        "password": {"type": "string"},
                        "role": {"$ref": "#/components/schemas/Role"},
                        "pib": {"type": ["string", "null"], "description": "9 cifara – obavezno za 'company'"}
                    },
                    "required": ["name", "email", "password"]
                },
                "LoginRequest": {
                    "type": "object",
                    "properties": {
                        "email": {"type": "string", "format": "email"},
                        "password": {"type": "string"}
                    },
                    "required": ["email", "password"]
                },
                "UpdateMeRequest": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "pib": {"type": ["string", "null"], "description": "Samo company; 9 cifara"},
                        "change_password": {
                            "type": "object",
                            "properties": {
                                "current_password": {"type": "string"},
                                "new_password": {"type": "string"}
                            }
                        }
                    }
                },
                "CreateProductRequest": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "code": {"type": "string"},
                        "material_type": {"type": ["string", "null"]},
                        "owner_user_id": {"type": "integer", "description": "Obavezno za admina; company ignoriše i postavlja sebe"}
                    },
                    "required": ["name", "code"]
                },
                "CreateInvoiceItemRequest": {
                    "type": "object",
                    "properties": {
                        "product_id": {"type": "integer"},
                        "qty": {"type": "number"},
                        "unit_price": {"type": "number", "description": "Bez PDV"},
                        "tax_rate": {"type": "integer", "enum": [0, 10, 20]}
                    },
                    "required": ["product_id", "qty", "unit_price", "tax_rate"]
                },
                "CreateInvoiceRequest": {
                    "type": "object",
                    "properties": {
                        "number": {"type": "string"},
                        "issue_date": {"type": "string", "format": "date"},
                        "due_date": {"type": ["string", "null"], "format": "date"},
                        "currency": {"type": "string", "enum": ["RSD", "EUR", "USD"], "default": "RSD"},
                        "recipient_pib": {"type": "string", "pattern": "^\\d{9}$"},
                        "status": {"$ref": "#/components/schemas/InvoiceStatus"},
                        "items": {"type": "array", "items": {"$ref": "#/components/schemas/CreateInvoiceItemRequest"}},
                        "note": {"type": ["string", "null"]}
                    },
                    "required": ["number", "issue_date", "currency", "recipient_pib", "status", "items"]
                },

                # ==== Collections ====
                "InvoiceListAdmin": {
                    "type": "object",
                    "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/Invoice"}}},
                    "required": ["items"]
                },
                "InvoiceListCompany": {
                    "type": "object",
                    "properties": {
                        "outbound": {"type": "array", "items": {"$ref": "#/components/schemas/Invoice"}},
                        "inbound": {"type": "array", "items": {"$ref": "#/components/schemas/Invoice"}}
                    },
                    "required": ["outbound", "inbound"]
                },

                # ==== Envelopes ====
                "AuthUserResponse": {
                    "type": "object",
                    "properties": {"user": {"$ref": "#/components/schemas/User"}},
                    "required": ["user"]
                },
                "InvoiceResponse": {
                    "type": "object",
                    "properties": {"invoice": {"$ref": "#/components/schemas/Invoice"}},
                    "required": ["invoice"]
                },
                "ErrorResponse": {
                    "type": "object",
                    "properties": {"error": {"type": "string"}},
                    "required": ["error"]
                },
                "SuccessResponse": {
                    "type": "object",
                    "properties": {"success": {"type": "boolean"}},
                    "required": ["success"]
                },
            },
            "responses": {
                "AuthUser": {
                    "description": "OK (Set-Cookie: eg_token=...)",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AuthUserResponse"}}}
                },
                "InvoiceSingle": {
                    "description": "OK",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/InvoiceResponse"}}}
                },
                "Success": {
                    "description": "OK",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/SuccessResponse"}}}
                },
                "BadRequest": {
                    "description": "Neispravan zahtev",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}
                },
                "Unauthorized": {
                    "description": "Nedostaje ili je nevažeći token",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}
                },
                "Forbidden": {
                    "description": "Zabranjeno",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}
                },
                "Conflict": {
                    "description": "Sukob (npr. email / code zauzet)",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}
                },
                "NotFound": {
                    "description": "Nije pronađeno",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}
                },
                "ServerError": {
                    "description": "Greška servera",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ErrorResponse"}}}
                }
            }
        }
    }
