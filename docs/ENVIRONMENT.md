# Environment Variables Reference

## Application
| Variable | Description | Default | Required | Example |
|---|---|---|---|---|
| `APP_NAME` | Application Name | Laravel | Yes | `Garage Guardian` |
| `APP_ENV` | Environment (local/production) | local | Yes | `production` |
| `APP_KEY` | Application Key | | Yes | `base64:...` |
| `APP_DEBUG` | Enable debug mode | false | Yes | `false` |
| `APP_URL` | Application URL | http://localhost | Yes | `https://app.example.com` |

## Database
| Variable | Description | Default | Required | Example |
|---|---|---|---|---|
| `DB_CONNECTION` | Database connection | mysql | Yes | `mysql` |
| `DB_HOST` | Database host | 127.0.0.1 | Yes | `mariadb` |
| `DB_PORT` | Database port | 3306 | Yes | `3306` |
| `DB_DATABASE` | Database name | laravel | Yes | `garage_db` |
| `DB_USERNAME` | Database username | root | Yes | `db_user` |
| `DB_PASSWORD` | Database password | | Yes | `secret123` |

## Cache & Session
| Variable | Description | Default | Required | Example |
|---|---|---|---|---|
| `CACHE_STORE` | Default cache store | file | Yes | `redis` |
| `SESSION_DRIVER` | Session driver | file | Yes | `redis` |

## Queue
| Variable | Description | Default | Required | Example |
|---|---|---|---|---|
| `QUEUE_CONNECTION` | Default queue connection | sync | Yes | `redis` |

## Storage (MinIO)
| Variable | Description | Default | Required | Example |
|---|---|---|---|---|
| `FILESYSTEM_DISK` | Default filesystem disk | local | Yes | `s3` |
| `AWS_ACCESS_KEY_ID` | MinIO Access Key | | Yes | `minioadmin` |
| `AWS_SECRET_ACCESS_KEY` | MinIO Secret Key | | Yes | `minioadmin` |
| `AWS_DEFAULT_REGION` | AWS Region | us-east-1 | Yes | `us-east-1` |
| `AWS_BUCKET` | S3 Bucket name | | Yes | `garage-bucket` |
| `AWS_ENDPOINT` | MinIO URL | | Yes | `http://minio:9000` |
| `AWS_USE_PATH_STYLE_ENDPOINT` | Use path style for S3 | false | Yes | `true` |

## WebSockets (Reverb)
| Variable | Description | Default | Required | Example |
|---|---|---|---|---|
| `BROADCAST_CONNECTION` | Broadcast driver | log | Yes | `reverb` |
| `REVERB_APP_ID` | Reverb App ID | | Yes | `123456` |
| `REVERB_APP_KEY` | Reverb App Key | | Yes | `key123` |
| `REVERB_APP_SECRET` | Reverb App Secret | | Yes | `secret123` |
| `REVERB_HOST` | Reverb host | localhost | Yes | `localhost` |
| `REVERB_PORT` | Reverb port | 8080 | Yes | `8080` |
| `REVERB_SCHEME` | Reverb protocol | http | Yes | `https` |
